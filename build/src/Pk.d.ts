import { Algo, GraphAdapter } from "./Header";
import { PkVertexData } from "./PkHeader";
export declare class PkImpl<TVertex> implements Algo<TVertex, PkVertexData> {
    private id;
    private stack;
    private deltaXyF;
    private deltaXyB;
    constructor();
    createVertex(adapter: GraphAdapter<TVertex, PkVertexData>, vertex: TVertex): PkVertexData;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(adapter: GraphAdapter<TVertex, PkVertexData>, vertex: TVertex): void;
    addEdge(adapter: GraphAdapter<TVertex, PkVertexData>, x: TVertex, y: TVertex): boolean;
    private dfs_f(first, adapter, ub);
    private dfs_b(first, adapter, lb);
    private sort(adapter, vertices);
    private reorder(adapter);
}
