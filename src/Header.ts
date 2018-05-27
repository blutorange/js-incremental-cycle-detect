import { Pair } from "andross";
import { VertexData } from "./InternalHeader";

/**
 * The interface for the entry point of this library. For each edge
 * that is added to the graph, it reports whether adding that edge
 * creates a cycle in the directed graph, and disallows the insertion
 * if it does.
 */
export interface CycleDetector<TVertex, TData = any> {
    /**
     * Adds the given vertex, if it does not exist, and it is allowed.
     * @param vertex Vertex to be added.
     * @return `true` iff the vertex was added.
     */
    addVertex(vertex: TVertex): boolean;

    /**
     * Deletes the given vertex, if it does exist, and it is allowed.
     * @param vertex Vertex to be deleted.
     * @return `true` iff the vertex was deleted.
     */
    deleteVertex(vertex: TVertex): boolean;

    /**
     * Adds the given edge, if it does not exist, and it is allowed.
     * May not be allowed eg if adding the edge creates a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was added.
     */
    addEdge(from: TVertex, to: TVertex): boolean;

    /**
     * Delete the given edge, if it exists and it is allowed.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was deleted.
     */
    deleteEdge(from: TVertex, to: TVertex): boolean;

    /**
     * The number of vertices in this graph.
     */
    getEdgeCount(): number;

    /**
     * The number of vertices in this graph.
     */
    getVertexCount(): number;

    /**
     * For performance, prefer `getVertices` and `getSuccessorsOf`.
     * @return All edges of this graph.
     */
    getEdges(): Iterator<Pair<TVertex>>;

    /**
     * @return All vertices in this graph.
     */
    getVertices(): Iterator<TVertex>;

    /**
     * @param vertex The vertex whose successors are to be found.
     * @return All immediate successors of the given vertex. None if the vertex does not exist.
     */
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;

    /**
     * @param vertex The vertex whose predecessors are to be found.
     * @return All immediate predecessors of the given vertex. None if the vertex does not exist.
     */
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;

    /**
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff this graph contains the given edge.
     */
    hasEdge(from: TVertex, to: TVertex): boolean;

    /**
     * @param from Vertex to be checked.
     * @return `true` iff this graph contains the given vertex.
     */
    hasVertex(vertex: TVertex): boolean;

    /**
     * @param key Vertex whose data to get.
     * @return The data associated with the vertex.
     */
    getData(vertex: TVertex): Readonly<VertexData<TData>>;

    /**
     * Associated arbitrary data with the vertex.
     * @param key Vertex whose data to set
     * @param data Data to be set on the vertex.
     */
    setData(vertex: TVertex, data: TData): void;

    /**
     * @param from Source vertex.
     * @param to Target vertex.
     * @return `true` iff the target vertex can be reached from the source vertex, eg. there is a path of edges connecting the source with the target.
     */
    isReachable(from: TVertex, to: TVertex): boolean;

    /**
     * Contracts the given edge, ie. delete the vertex `to` and
     * all edges between `from` and `to`, and moves all remaining edges
     * of `to` to `from`.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was contracted.
     */
    contractEdge(from: TVertex, to: TVertex): boolean;
}

/**
 * Vertex data structure used by {@link ObjectGraphAdapter}.
 */
export interface ObjectVertex {
    /** Set of immediate successors of this vertex. */
    next: Set<ObjectVertex>;
    /** Set of immediate predecessors of this vertex. */
    prev: Set<ObjectVertex>;
    /** Custom data for the algorithm. */
    data?: VertexData;
}
