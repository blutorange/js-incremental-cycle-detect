/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { Graph } from 'graphlib';
import { suite, test } from "mocha-typescript";
import { GraphlibAdapter, VertexData } from '../index';
import { toArray } from '../src/util';

interface Vertex extends VertexData {
    id: number;
    name: string;
}

@suite("Graph adapter - Graphlib")
export class GraphlibAdapterTest {
    private make<TVertexData extends VertexData = VertexData>(): GraphlibAdapter<TVertexData> {
        const adapter = GraphlibAdapter.create({graphlib: Graph});
        return adapter;
    }

    @test("should return the graphlib object")
    getGraph() {
        const g = this.make();
        expect(g.graph).to.be.an.instanceof(Graph);
    }

    @test("should allow associating vertex data")
    vertexData() {
        const g = this.make<Vertex>();
        const v1 = {id: 1, name: "foo"};
        const v2 = {id: 2, name: "bar"};
        const v3 = {id: 3, name: "baz"};
        g.addVertex("1", v1);
        g.addVertex("2", v2);
        g.addVertex("3", v3);
        expect(toArray(g.getVertices())
            .sort((lhs, rhs) => g.getVertexData(lhs).id - g.getVertexData(rhs).id)
            .map(v => ({id: g.getVertexData(v).id, name: g.getVertexData(v).name})))
            .to.deep.equal([v1, v2, v3]);
    }
}