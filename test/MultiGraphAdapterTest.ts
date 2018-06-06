/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import { MultiGraphAdapter } from '../index';

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

@suite("Graph adapter - Multi")
export class MultiAdapterTest {
    private make<TVertex, TEdgeData = any, TEdgeLabel = any>(): MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel> {
        const adapter = new MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel>();
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

    @test("should not add the labeled edge if it exists already")
    addEdgeWithExistingLabel() {
        const g = this.make();
        expect(g.addEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.addEdge(1, 2, "foo")).to.be.false;
        expect(g.getEdgeCount()).to.equal(1);
    }

    @test("should differentiate between total and unqiue edges")
    uniqueEdgeCount() {
        const g = this.make();
        expect(g.addEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.getUniqueEdgeCount()).to.equal(1);

        expect(g.addEdge(1, 3, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getUniqueEdgeCount()).to.equal(2);

        expect(g.addEdge(1, 2, "bar")).to.be.true;
        expect(g.getEdgeCount()).to.equal(3);
        expect(g.getUniqueEdgeCount()).to.equal(2);

        expect(g.deleteEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getUniqueEdgeCount()).to.equal(1);
    }
}