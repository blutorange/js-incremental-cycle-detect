import { Omit, Pair } from "andross";
import { Graph, GraphOptions } from "graphlib";

export type CustomVertexData<TVertexData extends VertexData> = Omit<TVertexData, keyof VertexData>;

/** Options that can be passed to {@link GenericGraphAdapter}. */
export interface GenericGraphAdapterOptions<TVertex> {
    /** The cycle detector algorithm, defaults to {@link PearceKellyDetector}. */
    cycleDetector: CycleDetector<TVertex>;
    /**
     * For creating a new `Map`. Defaults to the native `Map`.
     * If you need to support enviroments without a native `Map` implementation
     * and don't want to use a global polyfill, pass the `Map` object with this
     * options:
     *
     * ```javascript
     * import * as Map from "core-js/es6/map";
     * const graph = new GenericGraphAdapter({mapConstructor: Map}):
     * ```
     */
    mapConstructor: MapConstructor;
}

export type GraphlibConstructor = new (options?: GraphOptions) => Graph;

/** Options that can be passed to {@link GraphlibAdapter}. */
export interface GraphlibAdapterOptions<TVertex> {
    /** The cycle detector algorithm, defaults to {@link PearceKellyDetector}. */
    cycleDetector: CycleDetector<TVertex>;
    /**
     * Constructor for creating a new graphlib graph. This way we don't
     * have a hard dependency on `graphlib` and minified code stays small.
     */
    graphlib: GraphlibConstructor;
    /** Additional options for the graph that are passed to the graph constructor. */
    graphOptions: Partial<Omit<GraphOptions, "directed" | "multigraph">>;
}

/**
 * Adapter for a graph data structure. These are the only methods the algorithm
 * {@link CycleDetector} needs. See {@link GenericGraphAdapter} and {@link GraphlibAdapter}
 * for two sample implementations.
 */
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
 * The interface for the entry point of this library. The main method
 * is `addEdge`, which checks whether the given edge can be added without
 * adding a cycle, and if so, modifies the `VertexData` of the edge to reflect
 * this fact. It must be called at least once for each edge that was added.
 */
export interface CycleDetector<TVertex> {
    /**
     * Creates the vertex data the algorithm needs. This needs to be called
     * exactly once for each vertex of the graph and must be the data returned
     * by `GraphAdapter#getData`.
     * @param g The graph data structure to be used.
     * @param vertex New vertex that is about to be added or was just added.
     * @return The data to be set on the vertex.
     */
    createVertexData(g: GraphAdapter<TVertex>, vertex: TVertex): VertexData;

    /**
     * Checks whether adding the given edge creates a cycle. Must be called at least
     * once for each edge that was added for the algorithm to work correctly. It the
     * edge cannot be added, does not perform any modifications.
     * @param g The graph data structure to be used.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the specified edge can be added to the graph without introducing a cycle.
     */
    canAddEdge(g: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean;

    /**
     * Checks whether the target vertex can be reached from the source vertex,
     * possibly with some algorithm-specific optimizations.
     * @param g The graph data structure to be used.
     * @param source Source vertex for the search.
     * @param target Target vertex for the search.
     * @return `true` iff the target vertex can be reached from the source vertex, ie. iff there is a path from `source` to `target`.
     */
    isReachable(g: GraphAdapter<TVertex>, source: TVertex, target: TVertex): boolean;

    /**
     * Must be called when a vertex is deleted. The graph adapter must behave as
     * if the vertex was not deleted just yet, ie. return the data for the vertex etc.
     * @param g The graph data structure to be used.
     * @param vertex New vertex that is about to be added or was just deleted.
     */
    onVertexDeletion(g: GraphAdapter<TVertex>, vertex: TVertex): void;

    /**
     * @return `true` iff this algorithm supports querying a vertex's topological order.
     */
    supportsOrder(): boolean;

    /**
     * Returns the topological order of the vertex, if supported.
     * @param g The graph data structure to be used.
     * @param vertex Vertex for which to determine its order.
     * @return The topological order of the given vertex.
     */
    getOrder(g: GraphAdapter<TVertex>, vertex: TVertex): number;
}

/** Common methods implemented by the provided GraphAdapters. */
export interface CommonAdapter<TVertex, TEdgeData = any> {
    /**
     * Adds the given edge, if it does not exist, and it is allowed.
     * May not be allowed eg if adding the edge creates a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was added.
     */
    addEdge(from: TVertex, to: TVertex, data?: TEdgeData): boolean;
    /**
     * Adds the given vertex, if it does not exist, and it is allowed.
     * @param vertex Vertex to be added.
     * @return `true` iff the vertex was added.
     */
    addVertex(vertex: TVertex): boolean;
    /**
     * Contracts the given edge, ie. delete the vertex `to` and
     * all edges between `from` and `to`, and moves all remaining edges
     * of `to` to `from`.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param newVertex Vertex that replaces the old two vertices. If not given, defaults to `from`.
     * @return `true` iff the edge was contracted.
     */
    contractEdge(from: TVertex, to: TVertex, newVertex?: TVertex): boolean;
    /**
     * Delete the given edge, if it exists and it is allowed.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge was deleted.
     */
    deleteEdge(from: TVertex, to: TVertex): boolean;
    /**
     * Deletes the given vertex, if it does exist, and it is allowed.
     * @param vertex Vertex to be deleted.
     * @return `true` iff the vertex was deleted.
     */
    deleteVertex(vertex: TVertex): boolean;
    /**
     * @return The number of vertices in this graph.
     */
    getEdgeCount(): number;
    /**
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return The data associated with the given edge.
     */
    getEdgeData(from: TVertex, to: TVertex): TEdgeData;
    /**
     * @return All edges in this graph.
     */
    getEdges(): Iterator<Pair<TVertex, TVertex>>;
    /**
     * Returns the topological order of the vertex, if supported.
     * @param g The graph data structure to be used.
     * @param vertex Vertex for which to determine its order.
     * @return The topological order of the given vertex.
     */
    getOrder(vertex: TVertex): number;
    /**
     * @param vertex The vertex whose predecessors are to be found.
     * @return All immediate predecessors of the given vertex. None if the vertex does not exist.
     */
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    /**
     * @param vertex The vertex whose successors are to be found.
     * @return All immediate successors of the given vertex. None if the vertex does not exist.
     */
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    /**
     * @return The number of vertices in this graph.
     */
    getVertexCount(): number;
    /**
     * @return All vertices in this graph.
     */
    getVertices(): Iterator<TVertex>;
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
     * Checks whether the target vertex can be reached from the source vertex.
     * @param source Source vertex for the search.
     * @param target Target vertex for the search.
     * @return `true` iff the target vertex can be reached from the source vertex, ie. iff there is a path from `source` to `target`.
     */
    isReachable(source: TVertex, target: TVertex): boolean;
    /**
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param data The data to be associated with the given edge.
     * @return `true` iff the data was set, `false` iff the edge does not exist.
     */
    setEdgeData(from: TVertex, to: TVertex, data: TEdgeData): boolean;
    /**
     * @return `true` iff the algorithm in use supports querying a vertex's topological order.
     */
    supportsOrder(): boolean;
}

/**
 * The data the algorithm needs to assoicate with each vertex.
 * @internal
 */
export interface VertexData {
    /** Topological order of the vertex. It is updated each time an edge is added. */
    order: number;
    /** Used by the breadth-first search. */
    visited: boolean;
}
