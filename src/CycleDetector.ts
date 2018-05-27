import { Pair } from "andross";
import { CycleDetector } from "./Header";
import { GraphListener, PartialExcept, VertexData } from "./InternalHeader";

/**
 * Base class for the cycle detector. Handles the interaction with the cycle detection
 * algorithm. To do so, it needs to intercept calls when edges and vertices are added
 * or deleted. Extensions to this class need to implement the data structure, ie. adding
 * and removing vertices and edges, and querying the graph. Do not overwrite any methods
 * other than those marked `abstract`.
 */
export abstract class CycleDetectorImpl<TVertex, TData = any> implements CycleDetector<TVertex, TData> {
    private listener: GraphListener<TVertex>;

    constructor(listener: PartialExcept<GraphListener<TVertex>, "isReachable" | "createVertexData">) {
        if (!listener.afterAddEdge) { listener.afterAddEdge = (...args: any[]) => undefined; }
        if (!listener.afterAddVertex) { listener.afterAddVertex = () => undefined; }
        if (!listener.afterDeleteEdge) { listener.afterDeleteEdge = () => undefined; }
        if (!listener.afterDeleteVertex) { listener.afterDeleteVertex = () => undefined; }
        if (!listener.beforeAddEdge) { listener.beforeAddEdge = () => true; }
        if (!listener.beforeAddVertex) { listener.beforeAddVertex = () => true; }
        if (!listener.beforeDeleteEdge) { listener.beforeDeleteEdge = () => true; }
        if (!listener.beforeDeleteVertex) { listener.beforeDeleteVertex = () => true; }
        this.listener = listener as any;
    }

    addVertex(vertex: TVertex): boolean {
        if (this.hasVertex(vertex)) {
            return false;
        }
        if (!this.listener.beforeAddVertex(this, vertex)) {
            return false;
        }
        this._addVertex(vertex);
        this._setData(vertex, this.listener.createVertexData(vertex));
        this.listener.afterAddVertex(this, vertex);
        return true;
    }

    addEdge(from: TVertex, to: TVertex): boolean {
        // self cycle
        if (from === to) {
            return false;
        }
        // check sanity, do vertices exist?
        this.addVertex(from);
        this.addVertex(to);
        if (this.hasEdge(from, to)) {
            return false;
        }
        if (!this.listener.beforeAddEdge(this, from, to)) {
            return false;
        }
        this._addEdge(from, to);
        this.listener.afterAddEdge(this, from, to);
        return true;
    }

    deleteEdge(from: TVertex, to: TVertex): boolean {
        if (!this.hasEdge(from, to)) {
            return false;
        }
        if (!this.listener.beforeDeleteEdge(this, from, to)) {
            return false;
        }
        this._deleteEdge(from, to);
        this.listener.afterDeleteEdge(this, from, to);
        return true;
    }

    deleteVertex(vertex: TVertex): boolean {
        if (!this.hasVertex(vertex)) {
            return false;
        }
        if (!this.listener.beforeDeleteVertex(this, vertex)) {
            return false;
        }
        this._deleteData(vertex);
        this._deleteVertex(vertex);
        this.listener.afterDeleteVertex(this, vertex);
        return true;
    }

    isReachable(from: TVertex, to: TVertex): boolean {
        return this.listener.isReachable(this, from, to);
    }

    getData(vertex: TVertex): VertexData<TData> {
        this.addVertex(vertex);
        return this._getData(vertex);
    }

    setData(vertex: TVertex, data: TData): void {
        this.addVertex(vertex);
        (this._getData(vertex).custom as TData) = data;
    }

    contractEdge(from: TVertex, to: TVertex): boolean {
        if (!this.hasEdge(from, to)) {
            return false;
        }

        this.deleteEdge(from, to);

        // If target is still reachable after removing the edge(s) between source
        // and target, merging both vertices results in a cycle.
        if (this.listener.isReachable(this, from, to)) {
            this.addEdge(from, to);
            return false;
        }

        const succ = [];
        const pred = [];

        // Remove all edges from the second vertex.
        for (let it = this.getSuccessorsOf(to), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(to, res.value);
            succ.push(res.value);
        }

        for (let it = this.getPredecessorsOf(to), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, to);
            pred.push(res.value);
        }

        // Add all the removed edges to the first vertex.
        for (const node of succ) {
            this.addEdge(from, node);
        }
        for (const node of pred) {
            this.addEdge(node, from);
        }

        // Finally delete the second vertex. Now the edge is contracted.
        this.deleteVertex(to);

        return true;
    }

    abstract getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    abstract getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    abstract hasEdge(from: TVertex, to: TVertex): boolean;
    abstract hasVertex(vertex: TVertex): boolean;
    abstract getEdgeCount(): number;
    abstract getVertexCount(): number;
    abstract getEdges(): Iterator<Pair<TVertex>>;
    abstract getVertices(): Iterator<TVertex>;

    /**
     * Removes the data associated with the vertex.
     * @param vertex Vertex whose data to delete.
     */
    protected abstract _deleteData(vertex: TVertex): void;

    /**
     * Associated arbitrary data with the vertex. Called after it
     * was ascertained the vertex exists.
     * @param vertex Vertex with which to associate data.
     * @param data Data to be set on the vertex
     */
    protected abstract _setData(vertex: TVertex, data: VertexData): void;

    /**
     * Get the arbitrary data associated with the vertex. Called after it
     * was ascertained the vertex exists.
     * @param vertex Vertex whose data to get.
     * @return The vertex's data.
     */
    protected abstract _getData(vertex: TVertex): Readonly<VertexData<TData>>;

    /**
     * Called in order to add an edge, after it was ascertained the edge may be added,
     * that the vertices exists and that the edge does not exist already.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     */
    protected abstract _addEdge(from: TVertex, to: TVertex): void;

    /**
     * Add a vertex. Called after it was ascertained that the vertex does not
     * exist yet and may be added.
     * @param vertex Vertex to be added.
     */
    protected abstract _addVertex(vertex: TVertex): void;

    /**
     * Deletes an edge. Called after it was ascertained the edge exists and
     * that it may be deleted.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     */
    protected abstract _deleteEdge(from: TVertex, to: TVertex): void;

    /**
     * Deletes a vertex. Called after it was ascertained that the vertex does exists
     * and may be deleted.
     * @param vertex Vertex to be deleted.
     */
    protected abstract _deleteVertex(vertex: TVertex): void;
}
