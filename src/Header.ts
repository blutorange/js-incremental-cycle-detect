import { Omit } from "andross";
import { Graph, GraphOptions } from "graphlib";
import { VertexData } from "./InternalHeader";

export interface GenericGraphAdapterOptions<TVertex> {
    cycleDetector: CycleDetector<TVertex>;
    mapConstructor: MapConstructor;
}

export interface GraphlibAdapterOptions<TVertex> {
    cycleDetector: CycleDetector<TVertex>;
    graphlib: GraphlibConstructor;
    graphOptions: Partial<Omit<GraphOptions, "directed" | "multigraph">>;
}

export type GraphlibConstructor = (options?: GraphOptions) => Graph;

export interface GraphAdapter<TVertex> {
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
     * @param key Vertex whose data to get.
     * @return The data associated with the vertex.
     */
    getData(vertex: TVertex): VertexData;
}

/**
 * The interface for the entry point of this library. For each edge
 * that is added to the graph, it reports whether adding that edge
 * creates a cycle in the directed graph, and disallows the insertion
 * if it does.
 */
export interface CycleDetector<TVertex, TData = any> {
    createVertexData(g: GraphAdapter<TVertex>, vertex: TVertex): VertexData;

    canAddEdge(g: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean;

    /**
     * Contracts the given edge, ie. delete the vertex `to` and
     * all edges between `from` and `to`, and moves all remaining edges
     * of `to` to `from`.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was contracted.
     */
    canContractEdge(g: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean;
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
