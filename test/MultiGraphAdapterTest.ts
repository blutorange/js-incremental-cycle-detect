/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import { MultiGraphAdapter } from '../index';
import { toArray } from '../src/util';

interface Vertex {
    id: number;
    name: string;
}

function edgeSorter3(lhs: [any, any, any], rhs: [any,any,any]): number {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    if (lhs[1] < rhs[1]) return -1;
    if (lhs[1] > rhs[1]) return 1;
    if (lhs[2] < rhs[2]) return -1;
    if (lhs[2] > rhs[2]) return 1;
    return 0;
}

function edgeSorter2(lhs: [any, any], rhs: [any, any]): number {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    if (lhs[1] < rhs[1]) return -1;
    if (lhs[1] > rhs[1]) return 1;
    return 0;
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
        expect(g.addLabeledEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.getUniqueEdgeCount()).to.equal(1);

        expect(g.addLabeledEdge(1, 3, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getUniqueEdgeCount()).to.equal(2);

        expect(g.addLabeledEdge(1, 2, "bar")).to.be.true;
        expect(g.getEdgeCount()).to.equal(3);
        expect(g.getUniqueEdgeCount()).to.equal(2);

        expect(g.deleteEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getUniqueEdgeCount()).to.equal(2);
    }

    @test("should support order")
    supportsOrder() {
        const g = this.make();
        expect(g.supportsOrder()).to.be.true;
    }

    @test("should return the bundled edges")
    getEdges() {
        const g = this.make();
        g.addEdge(3, 7 , "c");
        g.addEdge(2, 3 , "baz");
        g.addEdge(1, 2 , "foo");
        g.addEdge(3, 6 , "b");
        g.addEdge(3, 5 , "a");
        g.addEdge(1, 2 , "bar");
        expect(toArray(g.getEdges()).sort(edgeSorter2)).to.deep.equal([
            [1, 2],
            [2, 3],
            [3, 5],
            [3, 6],
            [3, 7]
        ]);
        g.deleteEdge(1, 2);
        expect(toArray(g.getEdges()).sort(edgeSorter2)).to.deep.equal([
            [2, 3],
            [3, 5],
            [3, 6],
            [3, 7]
        ]);
    }

    @test("should return the all individual edges")
    getUniqueEdges() {
        const g = this.make();
        g.addLabeledEdge(3, 7 , "c");
        g.addLabeledEdge(2, 3 , "baz");
        g.addLabeledEdge(1, 2 , "foo");
        g.addLabeledEdge(3, 6 , "b");
        g.addLabeledEdge(3, 5 , "a");
        g.addLabeledEdge(1, 2 , "bar");
        expect(toArray(g.getLabeledEdges()).sort(edgeSorter3)).to.deep.equal([
            [1, 2, "bar"],
            [1, 2, "foo"],
            [2, 3, "baz"],
            [3, 5, "a"],
            [3, 6, "b"],
            [3, 7, "c"],
        ]);
        g.deleteEdge(1, 2, "bar");
        g.deleteEdge(3, 6);
        expect(toArray(g.getLabeledEdges()).sort(edgeSorter3)).to.deep.equal([
            [1, 2, "foo"],
            [2, 3, "baz"],
            [3, 5, "a"],
            [3, 7, "c"],
        ]);
    }

    @test("should return the labeled successors")
    getSuccessors() {
        const g = this.make();
        g.addLabeledEdge(1, 2 , "foo");
        g.addLabeledEdge(1, 2 , "bar");
        g.addLabeledEdge(1, 3 , "baz");
        g.addLabeledEdge(1, 5 , "foo");
        g.addLabeledEdge(3, 7 , undefined);
        g.addLabeledEdge(3, 6 , undefined);
        expect(toArray(g.getSuccessorsOf(2))).to.deep.equal([]);
        expect(toArray(g.getSuccessorsOf(1, "bar"))).to.deep.equal([2]);
        expect(toArray(g.getSuccessorsOf(1, "baz"))).to.deep.equal([3]);
        expect(toArray(g.getSuccessorsOf(1, "foo")).sort()).to.deep.equal([2, 5]);
        expect(toArray(g.getSuccessorsOf(3, undefined)).sort()).to.deep.equal([6, 7]);
        g.deleteEdge(1, 2, "foo");
        expect(toArray(g.getSuccessorsOf(1, "foo"))).to.deep.equal([5]);
    }

    @test("should return the labeled predecessors")
    getPredecessors() {
        const g = this.make();
        g.addLabeledEdge(2, 1 , "foo");
        g.addLabeledEdge(2, 1 , "bar");
        g.addLabeledEdge(3, 1 , "baz");
        g.addLabeledEdge(5, 1 , "foo");
        g.addLabeledEdge(7, 3 , undefined);
        g.addLabeledEdge(6, 3 , undefined);
        expect(toArray(g.getPredecessorsOf(2, "bar"))).to.deep.equal([]);
        expect(toArray(g.getPredecessorsOf(1, "bar"))).to.deep.equal([2]);
        expect(toArray(g.getPredecessorsOf(1, "baz"))).to.deep.equal([3]);
        expect(toArray(g.getPredecessorsOf(1, "foo")).sort()).to.deep.equal([2, 5]);
        expect(toArray(g.getPredecessorsOf(3, undefined)).sort()).to.deep.equal([6, 7]);
        g.deleteEdge(2, 1, "foo");
        expect(toArray(g.getPredecessorsOf(1, "foo"))).to.deep.equal([5]);
    }

    @test("should return all labeled edges between two vertices")
    getEdgeLabels() {
        const g = this.make();
        g.addLabeledEdge(1, 2 , "foo");
        g.addLabeledEdge(1, 2 , "bar");
        g.addLabeledEdge(1, 3 , "baz");
        g.addLabeledEdge(1, 5, "foo");
        g.addLabeledEdge(3, 7, undefined);
        g.addLabeledEdge(3, 6 , undefined);
        expect(toArray(g.getEdgeLabels(1, 2)).sort()).to.deep.equal(["bar", "foo"]);
        expect(toArray(g.getEdgeLabels(1, 3)).sort()).to.deep.equal(["baz"]);
        expect(toArray(g.getEdgeLabels(1, 5)).sort()).to.deep.equal(["foo"]);
        expect(toArray(g.getEdgeLabels(3, 6)).sort()).to.deep.equal([undefined]);
        expect(toArray(g.getEdgeLabels(3, 7)).sort()).to.deep.equal([undefined]);
        expect(toArray(g.getEdgeLabels(1, 7)).sort()).to.deep.equal([]);
    }

    @test("should not do anything when deleting a non-existing edge")
    deleteNonexistingEdge() {
        const g = this.make();
        g.addLabeledEdge(1, 2, "foo");
        g.addLabeledEdge(1, 2, "bar");
        expect(g.deleteEdge(1, 3, "foo")).to.be.false;
        expect(g.deleteEdge(1, 2, "foo")).to.be.true;
    }


    @test("should delete the last remaining edge")
    deleteEdge() {
        const g = this.make();
        g.addLabeledEdge(1, 2, "foo");
        g.addLabeledEdge(1, 2, "bar");
        expect(g.getEdgeCount()).to.equal(2);
        g.deleteEdge(1, 2, "bar");
        expect(g.getEdgeCount()).to.equal(1);
        g.deleteEdge(1, 2, "foo");
        expect(g.getEdgeCount()).to.equal(0);
        expect(toArray(g.getEdges()).length).to.equal(0);
    }

    @test("should detect cycle as long as there is at least one edge between vertices")
    detectCycle() {
        const g = this.make();
        expect(g.addLabeledEdge(1, 2, "foo")).to.be.true;
        expect(g.addLabeledEdge(2, 3, "bar")).to.be.true;
        expect(g.addLabeledEdge(3, 4, "baz")).to.be.true;
        expect(g.addLabeledEdge(4, 1, "foo")).to.be.false;
        expect(g.addLabeledEdge(4, 1)).to.be.false;
        expect(g.addLabeledEdge(1, 2, "foo2")).to.be.true;
        expect(g.addLabeledEdge(4, 1)).to.be.false;
        expect(g.deleteEdge(1, 2, "foo")).to.be.true;
        expect(g.addLabeledEdge(4, 1)).to.be.false;
        expect(g.deleteEdge(1, 2, "foo2")).to.be.true;
        expect(g.addLabeledEdge(4, 1)).to.be.true;
    }

    @test("should keep all edges when contracting")
    contractEdge() {
        const g = this.make<number>();
        expect(g.addLabeledEdge(-1, 0, "bar0")).to.be.true;
        expect(g.addLabeledEdge(-1, 2, "bar1")).to.be.true;
        expect(g.addLabeledEdge(0, 2, "x")).to.be.true;
        expect(g.addLabeledEdge(0, 4, "y")).to.be.true;
        expect(g.addLabeledEdge(1, 2, "foo")).to.be.true;
        expect(g.addLabeledEdge(1, 2, "bar")).to.be.true;
        expect(g.addLabeledEdge(2, 3, "baz")).to.be.true;
        expect(g.addLabeledEdge(2, 3, "baz2")).to.be.true;
        expect(g.addLabeledEdge(2, 4, "foobar")).to.be.true;
        expect(g.contractEdge(0, 2, (x, y) => x + y + 7)).to.be.true;
        expect(toArray(g.getLabeledEdges()).sort(edgeSorter3)).to.deep.equal([
            [-1, 9, "bar0"],
            [-1, 9, "bar1"],
            [1, 9, "bar"],
            [1, 9, "foo"],
            [9, 3, "baz"],
            [9, 3, "baz2"],
            [9, 4, "foobar"],
            [9, 4, "y"],
        ]);
    }
}