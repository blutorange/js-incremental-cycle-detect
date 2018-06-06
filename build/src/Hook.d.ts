import { Algo, GraphAdapter, IncrementalTopSortHook, VertexData } from "./Header";
export declare class HookImpl<TVertex, TVertexData extends VertexData> implements IncrementalTopSortHook<TVertex, TVertexData> {
    private adapter;
    private algo;
    constructor(adapter: GraphAdapter<TVertex, TVertexData>, algo: Algo<TVertex, TVertexData>);
    addVertex(vertex: TVertex): void;
    addEdge(from: TVertex, to: TVertex): boolean;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(vertex: TVertex): void;
}
