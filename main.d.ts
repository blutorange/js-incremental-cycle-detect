export declare type ArrayFrom = <T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any) => U[];
export declare enum IncrementalTopologicalSortAlgorithm {
    PK = 0,
}
export interface PkVertexData {
    order: number;
    visited: boolean;
}
export interface PkOptions {
    Set?: SetConstructor;
    ArrayFrom?: ArrayFrom;
}
export interface GraphAdapter<TVertex, TVertexData> {
    addEdge(from: TVertex, to: TVertex): void;
    addVertex(vertex: TVertex): void;
    deleteData(key: TVertex): void;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(vertex: TVertex): void;
    getData(key: TVertex): PkVertexData;
    setData(key: TVertex, data: TVertexData): void;
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
}
export interface IncrementalTopSortHook<TVertex> {
    addVertex(node: TVertex): void;
    addEdge(from: TVertex, to: TVertex): boolean;
}
export declare type FactoryOptions<TVertex> = {} & (PkOptions & {
    adapter: GraphAdapter<TVertex, PkVertexData>;
    algorithm?: IncrementalTopologicalSortAlgorithm.PK;
});
export declare function create<TVertex>(opts: FactoryOptions<TVertex>): IncrementalTopSortHook<TVertex>;
