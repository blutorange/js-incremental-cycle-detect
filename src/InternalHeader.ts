import { CycleDetector } from "./Header";

/** @internal */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * The data the algorithm needs to assoicate with each vertex.
 * @internal
 */
export interface VertexData<T = any> {
    /** Topological order of the vertex. It is updated each time an edge is added. */
    order: number;
    /** Used by the breadth-first search. */
    visited: boolean;
    /** Custom user-defined data. */
    custom: T | undefined;
}

/** @internal */
export type ArrayFrom = <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any) => U[];

/** @internal */
export type BeforeAddVertexListener<TVertex> = (adapter: CycleDetector<TVertex>, vertex: TVertex) => boolean;
/** @internal */
export type AfterAddVertexListener<TVertex> = (adapter: CycleDetector<TVertex>, vertex: TVertex) => void;
/** @internal */
export type BeforeDeleteVertexListener<TVertex> = (adapter: CycleDetector<TVertex>, vertex: TVertex) => boolean;
/** @internal */
export type AfterDeleteVertexListener<TVertex> = (adapter: CycleDetector<TVertex>, vertex: TVertex) => void;
/** @internal */
export type BeforeAddEdgeListener<TVertex> = (adapter: CycleDetector<TVertex>, from: TVertex, to: TVertex) => boolean;
/** @internal */
export type AfterAddEdgeListener<TVertex> = (adapter: CycleDetector<TVertex>, from: TVertex, to: TVertex) => void;
/** @internal */
export type BeforeDeleteEdgeListener<TVertex> = (adapter: CycleDetector<TVertex>, from: TVertex, to: TVertex) => boolean;
/** @internal */
export type AfterDeleteEdgeListener<TVertex> = (adapter: CycleDetector<TVertex>, from: TVertex, to: TVertex) => void;

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
export interface GraphListener<TVertex> {
    /**
     *  Called before a vertex is added.
     * @return false iff the vertex is not to be added.
     */
    beforeAddVertex: BeforeAddVertexListener<TVertex>;
    /** Called after a vertex was added. */
    afterAddVertex: AfterAddVertexListener<TVertex>;
    /**
     *  Called before a vertex is deleted.
     * @return false iff the vertex is not to be deleted.
     */
    beforeDeleteVertex: BeforeDeleteVertexListener<TVertex>;
    /** Called after a vertex was deleted. */
    afterDeleteVertex: AfterDeleteVertexListener<TVertex>;
    /**
     *  Called before an edge is added.
     * @return false iff the edge is not to be added.
     */
    beforeAddEdge: BeforeAddEdgeListener<TVertex>;
    /** Called after an edge was added. */
    afterAddEdge: AfterAddEdgeListener<TVertex>;
    /**
     *  Called before an edge is deleted.
     * @return false iff the edge is not to be deleted.
     */
    beforeDeleteEdge: BeforeDeleteEdgeListener<TVertex>;
    /** Called after an edge was added. */
    afterDeleteEdge: AfterDeleteEdgeListener<TVertex>;
    /**
     * @param adapter Graph data structure.
     * @param source Source vertex.
     * @param target Target vertex.
     * @return True iff target can be reached from source.
     */
    isReachable(adapter: CycleDetector<TVertex>, source: TVertex, target: TVertex): boolean;
    /**
     * Creates the data needed by the algorithm for it to work. Called
     * when a new vertex is added to the graph.
     * @param vertex Vertex that is added.
     */
    createVertexData(vertex: TVertex): VertexData;
}
