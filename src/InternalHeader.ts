import { GraphAdapter } from "./Header";

/**
 * The data the algorithm needs to assoicate with each vertex.
 *
 * @internal
 */
export interface VertexData {
    /** Topological order of the vertex. It is updated each time an edge is added. */
    order: number;
    /** Used by the breadth-first search. */
    visited: boolean;
}

/**
 * @internal
 */
export type ArrayFrom = <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any) => U[];

/**
 * The algorithm responsible for the incremental topological sort.
 * It is informed by the container {@link IncrementalTopSort} when
 * edges and vertices are added or deleted. It must then take the
 * appropriate measures to preserve the topological sorting.
 *
 * If adding an edge introduces a cycle, it must return false and
 * behave as if the deleteEdge methods were never called.
 *
 * @internal
 */
export interface Algo<TVertex> {
    addEdge(adapter: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean;
    createVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex): VertexData;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex): void;
    isReachable(source: TVertex, target: TVertex, adapter: GraphAdapter<TVertex>): boolean;
}
