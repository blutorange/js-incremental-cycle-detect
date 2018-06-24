/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { Graph } from 'graphlib';
import { suite, test } from "mocha-typescript";
import { GraphlibAdapter, GraphlibVertexData } from '../index';

/*
interface Vertex extends GraphlibVertexData {
    id: number;
    name: string;
}
*/

@suite("Graph adapter - Graphlib")
export class GraphlibAdapterTest {
    private make<TVertexData extends GraphlibVertexData = GraphlibVertexData>(): GraphlibAdapter<TVertexData> {
        const adapter = GraphlibAdapter.create({graphlib: Graph});
        return adapter;
    }

    @test("should return the graphlib object")
    getGraph() {
        const g = this.make();
        expect(g.graph).to.be.an.instanceof(Graph);
    }
}