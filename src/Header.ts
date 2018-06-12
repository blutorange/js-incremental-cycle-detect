import { BinaryOperator, Maybe, Omit, Pair, TypedFunction, UnaryOperator } from "andross";
import { Graph, GraphOptions } from "graphlib";

/**
 * The data the algorithm needs to associate with each vertex.
 * @internal
 */
export interface VertexData {
    /** Topological order of the vertex. It is updated each time an edge is added. */
    order: number;
    /** Used by the breadth-first search. */
    visited: boolean;
}

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

/** @see {@link MultiGraphAdapterOptions} */
export type MultiGraphEdgeData<TEdgeData, TEdgeLabel> = Map<Maybe<TEdgeLabel>, Maybe<TEdgeData>>;

/** @see {@link MultiGraphAdapterOptions} */
export type GraphFactory<TVertex, TEdgeData, TEdgeLabel> = () => CommonAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>> & ClonableAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>>;

/** Options that can be passed to {@link MultiGraphAdapter}. */
export interface MultiGraphAdapterOptions<TVertex, TEdgeData, TEdgeLabel> {
    /** For creating a graph data structure used as a base. Multiple edges are implemented as a special type of edge data. */
    graphFactory: GraphFactory<TVertex, TEdgeData, TEdgeLabel>;
    /** For creating a new `Map`. Defaults to the native `Map`. */
    mapConstructor: MapConstructor;
}

export interface GraphlibVertexData extends VertexData {
    /** Used as the name for the vertex when adding it to graphlib. */
    gid: string;
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
     * Creates the vertex data the algorithm needs. This needs to be called
     * exactly once for each vertex of the graph and must be the data returned
     * by `GraphAdapter#getData`.
     * @param g The graph data structure to be used.
     * @return The data to be set on the vertex.
     */
    createVertexData(g: GraphAdapter<TVertex>): VertexData;

    /**
     * Returns the topological order of the vertex, if supported.
     * @param g The graph data structure to be used.
     * @param vertex Vertex for which to determine its order.
     * @return The topological order of the given vertex.
     */
    getOrder(g: GraphAdapter<TVertex>, vertex: TVertex): number;

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
     * @return A independent copy of this detector for a possibly different
     * type of vertex. Changes to the state of this detector do not affect
     * the state of the cloned detector and vice-versa.
     * @typeparam TClonedVertex Type of the cloned vertices.
     */
    map<TClonedVertex>(): CycleDetector<TClonedVertex>;

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
}

export interface ClonableAdapter<TVertex, TEdgeData> {
    /**
     * Creates an independent copy of this graph data structure. Further
     * changes to this graph are not reflected in the returned copy, and
     * vice-versa.
     *
     * All vertices and edges are copied as-is and are not cloned, so that
     * changing the state of a vertex or edge also changes the state of the
     * vertex or edge in the copied graph.
     *
     * Optionally you can also pass a function for cloning the vertices and edges.
     *
     * @param vertexCloner Clone function that takes a vertex and returns a copy of it.
     * @param edgeDataCloner Clone function that takes an edge datum and returns a copy of it.
     * @return A copy of this graph.
     */
    clone(vertexCloner?: UnaryOperator<TVertex>, edgeDataCloner?: UnaryOperator<TEdgeData>): CommonAdapter<TVertex, TEdgeData> & ClonableAdapter<TVertex, TEdgeData>;
    /**
     * Creates an independent copy of this graph data structure and maps
     * each vertex and edge datum to a new vertex and edge datum. Further
     * changes to this graph are not reflected in the returned copy, and
     * vice-versa.
     *
     * @param vertexMapper Mapping function that takes a vertex and returns a mapped copy of it.
     * @param edgeDataMapper Mapping function that takes an edge datum and returns a mapped copy of it.
     * @return A mapped copy of this graph.
     * @typeparam TClonedVertex Type of the mapped vertices.
     * @typeparam TClonedEdgeData Type of the cloned edge data.
     */
    map<TClonedVertex, TClonedEdgeData>(vertexMapper: TypedFunction<TVertex, TClonedVertex>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>): CommonAdapter<TClonedVertex, TClonedEdgeData> & ClonableAdapter<TClonedVertex, TClonedEdgeData>;
}

/** Common methods implemented by the provided GraphAdapters. */
export interface CommonAdapter<TVertex = any, TEdgeData = any> {
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
     * Checks whether adding the edge would add a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge can be added without introducing a cycle.
     */
    canAddEdge(from: TVertex, to: TVertex): boolean;
    /**
     * Checks whether the edge can be contracted without creating a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge can be contracted without introducing a cycle.
     */
    canContractEdge(from: TVertex, to: TVertex): boolean;
    /**
     * Contracts the given edge, ie. delete the vertex `to` and
     * all edges between `from` and `to`, and moves all remaining edges
     * of `to` to `from`.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param vertexMerger The vertex that replaces the two old vertices. If not given, defaults to `from`.
     * @param dataMerger Another vertex may be connected two both of the vertices that are to be contracted.
     * In this case, their edge data needs to be merged. If not given, defaults to taking the edge data from
     * one edge.
     * @return `true` iff the edge was contracted.
     * @throws If vertex merger returns a vertex that is already contained in the graph.
     */
    contractEdge(from: TVertex, to: TVertex, vertexMerger?: BinaryOperator<TVertex>, dataMerger?: BinaryOperator<TEdgeData>): boolean;
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
    getEdgeData(from: TVertex, to: TVertex): Maybe<TEdgeData>;
    /**
     * Returns the edge data of all edges that point to (end at)
     * the given vertex.
     * @param vertex Vertex where the edge ends.
     * @return Edge data for the edges (*, vertex)
     */
    getEdgeDataTo(vertex: TVertex): Iterator<TEdgeData>;
    /**
     * Returns the edge data of all edges that point from (start at)
     * the given vertex.
     * @param vertex Vertex where the edge starts.
     * @return Edge data for the edges (vertex, *)
     */
    getEdgeDataFrom(vertex: TVertex): Iterator<TEdgeData>;
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
    setEdgeData(from: TVertex, to: TVertex, data: Maybe<TEdgeData>): boolean;
    /**
     * @return `true` iff the algorithm in use supports querying a vertex's topological order.
     */
    supportsOrder(): boolean;
}
