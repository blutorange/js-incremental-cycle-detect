/* tslint:disable */

// Tests functionality not covered by PkTest

import { Maybe, Triple } from 'andross';
import { expect } from "chai";
import { alg, Graph } from 'graphlib';
import { suite, test, timeout } from "mocha-typescript";
import * as Random from "random-js";
import { MultiGraphAdapter } from '../index';
import { toArray } from '../src/util';
import { assertOrder, edgeSorter2, edgeSorter3, edgeSorter4, iteratorLength } from './util';

const log: "js" | "dot" | "glib" | boolean = false;

interface Vertex {
    id: number;
    name: string;
}

function randomInsert(mygraph: MultiGraphAdapter<any>, yourgraph: Graph, edges: Triple<number, number, Maybe<string>>[], vertexCount: number, engine: Random.Engine): void {
    if (log) console.log("\n/// ===begin insert");
    
    let edgeCount = Random.integer(Math.floor(vertexCount), vertexCount*10)(engine);
    let chooseVertex = Random.integer(0, vertexCount - 1);
    let chooseLabel = Random.picker(["foo", "bar", "undefined"]);

    while (edgeCount -- > 0) {
        const from = chooseVertex(engine);
        const to = chooseVertex(engine);
        const label = chooseLabel(engine);

        const myHasEdge = mygraph.hasEdge(from, to, label);
        const yourHasEdge = yourgraph.hasEdge(String(from), String(to), label);

        if (log === "dot") console.log("  " + from + " -> " + to + "[label=\"" + label + "\"];");
        if (log === "glib") {
            console.log("expect(g.hasEdge(\"" + from + "\", \"" + to + "\", \"" + label + "\")).to.be." + myHasEdge + "; // is " + yourHasEdge);
            console.log("g.setEdge(\"" + from + "\", \"" + to + "\", \"" + label + "\");");
        }
        if (log === "js") console.log("expect(g.hasEdge(" + from + ", " + to + ", '" + label + "')).to.be." + yourHasEdge + "; // is " + myHasEdge);
        expect(myHasEdge).to.equal(yourHasEdge);

        if (from === to || myHasEdge) continue;

        yourgraph.setEdge(String(from), String(to), undefined, label);

        const myResult = mygraph.addLabeledEdge(from, to, label);
        const yourResult = alg.isAcyclic(yourgraph);

        if (log === "js") console.log("expect(g.addLabeledEdge(" + from + ", " + to + ", '" + label + "')).to.be." + yourResult + "; // is " + myResult);
        expect(myResult).to.equal(yourResult);

        // remove the offending edge that makes the graph cyclic
        if (!myResult) {
            yourgraph.removeEdge(String(from), String(to), label);
        }
        else {
            edges.push([from, to, label]);
        }
        if (edgeCount % 10 === 0) {
            assertOrder(mygraph);
        }
    }
    assertOrder(mygraph);
}

function randomDelete(mygraph: MultiGraphAdapter<any>, yourgraph: Graph, edges: Triple<number, number, Maybe<string>>[], engine: Random.Engine): void {
    if (log) console.log("\n// ===begin delete");

    let edgeCount = Random.integer(1, edges.length)(engine);

    Random.shuffle(engine, edges);

    while (edgeCount -- > 0) {
        const [from, to, label] = edges.pop() as [number, number, string | undefined];
        if (log) console.log("g.deleteEdge(" + from + ", " + to + ", '" + label + "');");
        yourgraph.removeEdge(String(from), String(to), label);
        mygraph.deleteEdge(from, to, label);
        if (edgeCount % 10 === 0) {
            assertOrder(mygraph);
        }
    }

    assertOrder(mygraph);
}

@suite("Graph adapter - Multi")
export class MultiAdapterTest {
    private make<TVertex, TEdgeData = any, TEdgeLabel = any>(): MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel> {
        const adapter = MultiGraphAdapter.create<TVertex, TEdgeData, TEdgeLabel>();
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
    labeledEdgeCount() {
        const g = this.make();
        expect(g.addLabeledEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.getLabeledEdgeCount()).to.equal(1);

        expect(g.addLabeledEdge(1, 3, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getLabeledEdgeCount()).to.equal(2);

        expect(g.addLabeledEdge(1, 2, "bar")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getLabeledEdgeCount()).to.equal(3);

        expect(g.deleteEdge(1, 2, "foo")).to.be.true;
        expect(g.getEdgeCount()).to.equal(2);
        expect(g.getLabeledEdgeCount()).to.equal(2);
    }

    @test("cannot contract edge if it results in a self cycle")
    contractEdgeSelfCycle() {
        // With two vertices
        const g1 = this.make();
        g1.addEdge(1, 2, "foo");
        expect(g1.canContractEdge(1 ,2)).to.be.true;
        g1.addEdge(1, 2, "bar");
        expect(g1.canContractEdge(1 ,2)).to.be.false;
  
        // With three vertices
        const g = this.make();
        g.addEdge(1, 2, undefined, "12");
        g.addEdge(2, 3, undefined, "23");
        g.addEdge(1, 3, undefined, "13");
        expect(g.canContractEdge(2, 3)).to.be.true;
        g.contractEdge(2, 3);
        expect(g.hasVertex(1)).to.be.true;
        expect(g.hasVertex(2)).to.be.true;
        expect(g.hasVertex(3)).to.be.false;
        expect(g.canContractEdge(1, 2)).to.be.false;
    }

    @test("contracting an edge removes it from the graph")
    contractingEdgeRemovesIt() {
        const g = this.make();
        g.addEdge(1, 2);
        g.addEdge(2, 3);
        g.addEdge(1, 3);
        expect(g.getLabeledEdgeCount()).to.equal(3);
        g.contractEdge(1, 3);
        expect(g.getLabeledEdgeCount()).to.equal(2);
        expect(iteratorLength(g.getLabeledEdges())).to.equal(2);
    }

    @test("deleting a vertex decreases the labelled edge count")
    deletingVertexDecreasesLabelledEdgeCount() {
        const g = this.make();
        g.addEdge(1, 2, 12, "12");
        g.addEdge(2, 3, 23, "23");
        g.addEdge(1, 3, 13, "13");
        expect(g.getEdgeCount()).to.equal(3);        
        expect(g.getLabeledEdgeCount()).to.equal(3);
        expect(iteratorLength(g.getLabeledEdges())).to.equal(3);
        g.deleteVertex(1);
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.getLabeledEdgeCount()).to.equal(1);
        expect(iteratorLength(g.getLabeledEdges())).to.equal(1);
    }

    @test("should support order")
    supportsOrder() {
        const g = this.make();
        expect(g.supportsOrder()).to.be.true;
    }

    @test("should check whether a labeled edge exists")
    hasEdge() {
        const g = this.make();

        expect(g.hasEdge(1, 2, "foo")).to.be.false;
        expect(g.hasEdge(1, 2, "bar")).to.be.false;
        g.addLabeledEdge(1, 2, "foo");
        expect(g.hasEdge(1, 2, "foo")).to.be.true;
        expect(g.hasEdge(1, 2, "bar")).to.be.false;
        g.addLabeledEdge(1, 2, "bar");
        expect(g.hasEdge(1, 2, "foo")).to.be.true;
        expect(g.hasEdge(1, 2, "bar")).to.be.true;
        
        expect(g.hasEdge(1, 2, undefined)).to.be.true;
        expect(g.hasLabeledEdge(1, 2, undefined)).to.be.false;
        expect(g.hasLabeledEdge(1, 3, undefined)).to.be.false;
        g.addLabeledEdge(1, 2, undefined);
        expect(g.hasLabeledEdge(1, 2, undefined)).to.be.true;
        expect(g.hasLabeledEdge(1, 3, undefined)).to.be.false;
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
    getLabeledEdges() {
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

    @test("should return the edge data from the vertex with the given label")
    getEdgeDataFrom() {
        const g = this.make();
        g.addLabeledEdge(1, 2 , "foo", 0);
        g.addLabeledEdge(1, 2 , "bar", 1);
        g.addLabeledEdge(1, 3 , "baz", 2);
        g.addLabeledEdge(1, 5 , "foo", 3);
        g.addLabeledEdge(3, 7 , undefined, 4);
        g.addLabeledEdge(3, 6 , undefined, 5);
        expect(toArray(g.getEdgeDataFrom(1, "foo")).sort()).to.deep.equal([0, 3]);
        expect(toArray(g.getEdgeDataFrom(1, "bar")).sort()).to.deep.equal([1]);
        expect(toArray(g.getEdgeDataFrom(1, "baz")).sort()).to.deep.equal([2]);
        expect(toArray(g.getEdgeDataFrom(3, undefined)).sort()).to.deep.equal([4, 5]);
    }

    @test("should return the edge data to the vertex with the given label")
    getEdgeDataTo() {
        const g = this.make();
        g.addLabeledEdge(2, 1 , "foo", 0);
        g.addLabeledEdge(2, 1 , "bar", 1);
        g.addLabeledEdge(3, 1 , "baz", 2);
        g.addLabeledEdge(5, 1 , "foo", 3);
        g.addLabeledEdge(7, 3 , undefined, 4);
        g.addLabeledEdge(6, 3 , undefined, 5);
        expect(toArray(g.getEdgeDataTo(1, "foo")).sort()).to.deep.equal([0, 3]);
        expect(toArray(g.getEdgeDataTo(1, "bar")).sort()).to.deep.equal([1]);
        expect(toArray(g.getEdgeDataTo(1, "baz")).sort()).to.deep.equal([2]);
        expect(toArray(g.getEdgeDataTo(3, undefined)).sort()).to.deep.equal([4, 5]);
    }

    @test("should return the labeled successors")
    canAddEdge() {
        const g = this.make();
        g.addLabeledEdge(0, 1, "foo");
        expect(g.canAddEdge(0, 1, "foo")).to.be.false;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.canAddEdge(0, 1, "bar")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.canAddEdge(0, 1, "foo")).to.be.false;
        expect(g.getEdgeCount()).to.equal(1);
        expect(g.canAddEdge(0, 1, "bar")).to.be.true;
        expect(g.getEdgeCount()).to.equal(1);
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
        expect(g.getLabeledEdgeCount()).to.equal(2);
        g.deleteEdge(1, 2, "bar");
        expect(g.getLabeledEdgeCount()).to.equal(1);
        g.deleteEdge(1, 2, "foo");
        expect(g.getLabeledEdgeCount()).to.equal(0);
        expect(toArray(g.getEdges()).length).to.equal(0);
        g.addLabeledEdge(1, 2, "foo");
        g.addLabeledEdge(1, 2, "bar");
        expect(g.getLabeledEdgeCount()).to.equal(2);
        g.deleteEdge(1, 2);
        expect(g.getLabeledEdgeCount()).to.equal(0);
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

    @test("should return the data for the edge as well")
    getEdgesWithData() {
        const g = this.make();
        expect(toArray(g.getLabeledEdgesWithData())).to.deep.equal([]);
        g.addEdge(1, 2, "foo", "label12");
        g.addEdge(1, 3, "bar", undefined);
        g.addEdge(4, 5, undefined, "label45");

        expect(toArray(g.getLabeledEdgesWithData()).sort(edgeSorter4)).to.deep.equal([
            [1, 2, "foo", "label12"],
            [1, 3, "bar", undefined],
            [4, 5, undefined, "label45"]
        ]);

        g.deleteLabeledEdge(1, 3, undefined);

        expect(toArray(g.getLabeledEdgesWithData()).sort(edgeSorter4)).to.deep.equal([
            [1, 2, "foo", "label12"],
            [4, 5, undefined, "label45"]
        ]);

        g.setEdgeData(1, 2, undefined, "label12");
        g.setEdgeData(4, 5, "baz", "label45");
        expect(toArray(g.getLabeledEdgesWithData()).sort(edgeSorter4)).to.deep.equal([
            [1, 2, undefined, "label12"],
            [4, 5, "baz", "label45"]
        ]);
        
        g.deleteVertex(2);
        expect(toArray(g.getLabeledEdgesWithData()).sort(edgeSorter4)).to.deep.equal([
            [4, 5, "baz", "label45"]
        ]);

        g.deleteVertex(5);
        expect(toArray(g.getLabeledEdgesWithData())).to.deep.equal([]);
    }

    @test("should pass random test")
    @timeout(20000)
    random() {
        const engine = Random.engines.mt19937();
        engine.seed(0x4213);
        for (let n = 20; n --> 0;) {
            const mygraph = this.make();
            const yourgraph = new Graph({directed: true, multigraph: true});
            const vertexCount = n * 4 + 10;
            const edges: Triple<number, number, Maybe<string>>[] = [];

            // Inserts and deletes
            if (log) {
                console.log("// ====== begin random test")
            }
            if (log === "dot") {
                console.log("digraph G {");
            }
            if (log === "glib") {
                console.log("const g = new Graph({directed:true, multigraph: true});");
            }
            if (log === "js") {
                console.log("const g = new MultiGraphAdapter();");
            }
            randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
            randomDelete(mygraph, yourgraph, edges, engine);
            randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
            randomDelete(mygraph, yourgraph, edges, engine);
            randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
            if (log === "dot") {
                console.log("}");
            }
        }
    }
}