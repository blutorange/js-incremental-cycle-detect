import { ArrayFrom, VertexData } from "./Header";
export interface PkVertexData extends VertexData {
    order: number;
    visited: boolean;
}
export interface PkOptions {
    Set?: SetConstructor;
    ArrayFrom?: ArrayFrom;
}
