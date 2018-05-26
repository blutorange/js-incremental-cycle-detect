import { VertexData } from "./InternalHeader";

/**
 * Interface for a data structure that allows storing arbitrary data
 * with a vertex. It is used by the algorithm to store a vertex's
 * topological order etc.
 */
export interface AssociatableGraph<TVertex> {
    deleteData(key: TVertex): void;
    getData(key: TVertex): VertexData;
    setData(key: TVertex, data: VertexData): void;
}

/**
 * Interface for a graph data structure that allows adding and
 * deleting edges and vertices, as well as querying a vertex's
 * immediate successors and predecessors.
 */
export interface ManipulableGraph<TVertex> {
    multiEdgeSupported: boolean;
    addEdge(from: TVertex, to: TVertex, id?: number): void;
    addVertex(vertex: TVertex): void;
    deleteEdge(from: TVertex, to: TVertex, id?: number): void;
    deleteVertex(vertex: TVertex): void;
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    hasEdge(from: TVertex, to: TVertex, id?: number): boolean;
    hasVertex(vertex: TVertex): boolean;
}

/**
 * A graph data structure that is both a {@link AssociatableGraph} and {@link ManipulableGraph}.
 */
export type GraphAdapter<TVertex> = AssociatableGraph<TVertex> & ManipulableGraph<TVertex>;

/**
 * The interface for the entry point of this library. For each edge
 * that is added to the graph, it reports whether adding that edge
 * creates a cycle in the directed graph, and disallows the insertion
 * if it does.
 */
export interface CycleDetector<TVertex, TGraphAdapter extends GraphAdapter<TVertex> = GraphAdapter<TVertex>> {
    addVertex(vertex: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    addEdge(from: TVertex, to: TVertex, id?: number): boolean;
    deleteEdge(from: TVertex, to: TVertex, id?: number): void;
    isReachable(from: TVertex, to: TVertex): boolean;
    unwrap(): TGraphAdapter;
    //contractEdge(from: TVertex, to: TVertex): boolean;
}

/**
 * Optional settings that can be passed when creating an {@link IncrementalTopSort} instance.
 */
export interface FactoryOptions<TVertex, TGraphAdapter extends GraphAdapter<TVertex>> {
    /**
     * Adapter for the graph data structure to be used.
     * Use your own or use {@link GenericGraphAdapter} or {@link GraphlibGraphAdapter}.
     */
    adapter?: TGraphAdapter;
}
