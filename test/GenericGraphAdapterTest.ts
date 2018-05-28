/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import { GenericGraphAdapter } from '../main';

function toArray<T>(it: Iterator<T>) {
    const arr: T[] = [];
    for (let res = it.next(); !res.done; res = it.next()) {
        arr.push(res.value);
    }
    return arr;
}

interface Vertex {
    id: number;
    name: string;
}

@suite("Graph adapter - Generic")
export class GenericAdapterTest {
    private make<TVertex, TSource = any, TTarget = any>(): GenericGraphAdapter<TVertex, TSource, TTarget> {
        const adapter = new GenericGraphAdapter<TVertex, TSource, TTarget>();
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

    @test("should allow associating edge source/target data")
    edgeData() {
        const g = this.make<number, string, boolean>();
        g.addEdge(0, 1, "foo");
        g.addEdge(0, 2, undefined, true);
        g.addEdge(1, 2, "bar", false);
        expect(g.getEdgeSourceData(0, 1)).to.equal("foo");
        expect(g.getEdgeSourceData(0, 2)).to.be.undefined;
        expect(g.getEdgeSourceData(1, 2)).to.equal("bar");
        expect(g.getEdgeSourceData(1, 0)).to.be.undefined;
        expect(g.getEdgeSourceData(2, 0)).to.be.undefined;
        expect(g.getEdgeSourceData(2, 1)).to.be.undefined;

        expect(g.getEdgeTargetData(0, 1)).to.be.undefined
        expect(g.getEdgeTargetData(0, 2)).to.be.be.true;
        expect(g.getEdgeTargetData(1, 2)).to.be.false;
        expect(g.getEdgeTargetData(1, 0)).to.be.undefined;
        expect(g.getEdgeTargetData(2, 0)).to.be.undefined;
        expect(g.getEdgeTargetData(2, 1)).to.be.undefined;
    }
}