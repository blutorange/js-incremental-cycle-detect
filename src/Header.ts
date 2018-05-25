import { PkOptions, PkVertexData } from "./PkHeader";

export enum IncrementalTopologicalSortAlgorithm {
    PK,
}

export type ArrayFrom = <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any) => U[];

export interface Algo<TVertex, TVertexData extends VertexData> {
    addEdge(adapter: GraphAdapter<TVertex, TVertexData>, from: TVertex, to: TVertex): boolean;
    createVertex(adapter: GraphAdapter<TVertex, TVertexData>, vertex: TVertex): TVertexData;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(adapter: GraphAdapter<TVertex, TVertexData>, vertex: TVertex): void;
}

// tslint:disable-next-line:no-empty-interface
export interface VertexData {}

export interface AssociatableGraph<TVertex, TVertexData extends VertexData> {
    deleteData(key: TVertex): void;
    getData(key: TVertex): TVertexData;
    setData(key: TVertex, data: TVertexData): void;
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

export type GraphAdapter<TVertex, TVertexData extends VertexData> = AssociatableGraph<TVertex, TVertexData> & ManipulableGraph<TVertex>;

export interface IncrementalTopSortHook<TVertex, TVertexData extends VertexData> {
    addVertex(vertex: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    addEdge(from: TVertex, to: TVertex): boolean;
    deleteEdge(from: TVertex, to: TVertex): void;
}

export type FactoryOptions<TVertex> = {
} &
(
    PkOptions & {
        adapter?: GraphAdapter<TVertex, PkVertexData>;
        algorithm?: IncrementalTopologicalSortAlgorithm.PK,
    }
);
