import { CycleDetector, PartialExcept } from "./Header";
import { GraphListener, VertexData } from "./InternalHeader";

/**
 * Base class for the cycle detector. Handles the interaction with the cycle detection
 * algorithm. To do so, it needs to intercept calls when edges and vertices are added
 * or deleted. Extensions to this class need to implement the data structure, ie. adding
 * and removing vertices and edges, and querying the graph. Do not overwrite any methods
 * other than those marked `abstract`.
 */
export abstract class CycleDetectorImpl<TVertex> implements CycleDetector<TVertex> {
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
        if (!this.hasVertex(from)) {
            this.addVertex(from);
        }
        if (!this.hasVertex(to)) {
            this.addVertex(to);
        }
        if (!this.hasEdge(from, to)) {
            if (!this.listener.beforeAddEdge(this, from, to)) {
                return false;
            }
        }
        this._addEdge(from, to);
        this.listener.afterAddEdge(this, from, to);
        return true;
    }

    deleteEdge(from: TVertex, to: TVertex): boolean {
        if (!this.listener.beforeDeleteEdge(this, from, to)) {
            return false;
        }
        const res = this._deleteEdge(from, to);
        this.listener.afterDeleteEdge(this, from, to);
        return res;
    }

    deleteVertex(vertex: TVertex): boolean {
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
    abstract getData(key: TVertex): VertexData;

    protected abstract _deleteData(key: TVertex): void;
    protected abstract _setData(key: TVertex, data: VertexData): void;
    protected abstract _addEdge(from: TVertex, to: TVertex): void;
    protected abstract _addVertex(vertex: TVertex): void;
    /** Deletes all edges between from and to. */
    protected abstract _deleteEdge(from: TVertex, to: TVertex): boolean;
    protected abstract _deleteVertex(vertex: TVertex): void;
}
