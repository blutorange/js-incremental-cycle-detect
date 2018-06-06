import { Builder } from "andross";
import { AssociatableGraph, GraphAdapter, ManipulableGraph, VertexData } from "./Header";
export declare class MapAssociator<TVertex, TVertexData extends VertexData> implements AssociatableGraph<TVertex, TVertexData> {
    private map;
    constructor(mapConstructor?: MapConstructor);
    deleteData(key: TVertex): void;
    getData(key: TVertex): TVertexData;
    setData(key: TVertex, data: TVertexData): void;
}
export declare class GenericManipulable<TVertex> implements ManipulableGraph<TVertex> {
    private forward;
    private backward;
    private vertices;
    private setConstructor;
    constructor(setConstructor?: SetConstructor, mapConstructor?: MapConstructor);
    addEdge(from: TVertex, to: TVertex): void;
    addVertex(vertex: TVertex): void;
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex>;
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex>;
    hasEdge(from: TVertex, to: TVertex): boolean;
    hasVertex(vertex: TVertex): boolean;
    deleteEdge(from: TVertex, to: TVertex): void;
    deleteVertex(vertex: TVertex): void;
}
export declare class GraphAdapterBuilder<TVertex, TVertexData extends VertexData> implements Builder<GraphAdapter<TVertex, TVertexData>> {
    private associatable?;
    private manipulable?;
    data(dataStructure: ManipulableGraph<TVertex>): this;
    associate(associatable: AssociatableGraph<TVertex, TVertexData>): this;
    build(): GraphAdapter<TVertex, TVertexData>;
}
