/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import { GenericGraphAdapter } from '../index';
import { toArray } from '../src/util';

interface Vertex {
    id: number;
    name: string;
}

@suite("Graph adapter - Generic")
export class GenericAdapterTest {
    private make<TVertex, TEdgeData = any, TTarget = any>(): GenericGraphAdapter<TVertex, TEdgeData> {
        const adapter = GenericGraphAdapter.create<TVertex, TEdgeData>();
        return adapter;
    }

    @test("should allow associating vertex data")
    vertexData() {
        const g = this.make<Vertex>();
        const v1 = {id: 1, name: "foo"};
        const v2 = {id: 2, name: "bar"};
        const v3 = {id: 3, name: "baz"};
        g.addVertex(v1);
        g.addVertex(v2);
        g.addVertex(v3);
        expect(toArray(g.getVertices()).sort((lhs, rhs) => lhs.id - rhs.id)).to.deep.equal([v1, v2, v3]);
    }
}