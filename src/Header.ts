import { PkVertexData } from "./PkHeader";

export type ArrayFrom = <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any) => U[];

export interface Algo<TVertex> {
    addEdge(adapter: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean;
    createVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex): PkVertexData;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex): void;
    isReachable(source: TVertex, target: TVertex, adapter: GraphAdapter<TVertex>): boolean;
}

export interface AssociatableGraph<TVertex> {
    deleteData(key: TVertex): void;
    getData(key: TVertex): PkVertexData;
    setData(key: TVertex, data: PkVertexData): void;
}

export interface ManipulableGraph<TVertex> {
    addEdge(from: TVertex, to: TVertex): void;
    addVertex(vertex: TVertex): void;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    hasEdge(from: TVertex, to: TVertex): boolean;
    hasVertex(vertex: TVertex): boolean;
}

export type GraphAdapter<TVertex> = AssociatableGraph<TVertex> & ManipulableGraph<TVertex>;

export interface IncrementalTopSortHook<TVertex> {
    addVertex(vertex: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    addEdge(from: TVertex, to: TVertex): boolean;
    deleteEdge(from: TVertex, to: TVertex): void;
    contractEdge(from: TVertex, to: TVertex): boolean;
}

export interface FactoryOptions<TVertex> {
    adapter?: GraphAdapter<TVertex>;
}
