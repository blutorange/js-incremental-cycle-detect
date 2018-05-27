import { VertexData } from "./InternalHeader";

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * The interface for the entry point of this library. For each edge
 * that is added to the graph, it reports whether adding that edge
 * creates a cycle in the directed graph, and disallows the insertion
 * if it does.
 */
export interface CycleDetector<TVertex> {
    addVertex(vertex: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    addEdge(from: TVertex, to: TVertex): boolean;
    /**
     * Delete the given edge(s).
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param id Id of the edge (if multiple edges between two vertices are supported).
     */
    deleteEdge(from: TVertex, to: TVertex): void;
    isReachable(from: TVertex, to: TVertex): boolean;
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    hasEdge(from: TVertex, to: TVertex): boolean;
    hasVertex(vertex: TVertex): boolean;
    getData(key: TVertex): VertexData;
    contractEdge(from: TVertex, to: TVertex): boolean;
}

export interface ObjectVertex {
    /** Set of immediate successors of this vertex. */
    next: Set<ObjectVertex>;
    /** Set of immediate predecessors of this vertex. */
    prev: Set<ObjectVertex>;
    /** Custom data for the algorithm. */
    data?: VertexData;
}

export interface IdVertex {
    /** Id of this vertex. */
    id: number;
    /** Set of immediate successors of this vertex. */
    next: (IdVertex|undefined)[];
    /** Set of immediate predecessors of this vertex. */
    prev: (IdVertex|undefined)[];
    data?: VertexData;
}
