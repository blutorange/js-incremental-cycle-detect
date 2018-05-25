/* tslint:disable */

import { expect } from "chai";
import { Graph, alg } from "graphlib";
import { suite, test, timeout } from "mocha-typescript";
import * as Random from "random-js";
import { createGraph } from "../main";

@suite("PkTest")
export class PkTest {

    @test("should detect cycles when inserting edges in increasing order")
    detectCycleIncreasingInsert() {
        const g = createGraph();
        expect(g.addEdge(0, 1)).to.be.true;
        expect(g.addEdge(1, 2)).to.be.true;
        expect(g.addEdge(2, 3)).to.be.true;
        expect(g.addEdge(3, 4)).to.be.true;
        expect(g.addEdge(4, 5)).to.be.true;
        expect(g.addEdge(5, 4)).to.be.false;
        expect(g.addEdge(5, 3)).to.be.false;
        expect(g.addEdge(5, 2)).to.be.false;
        expect(g.addEdge(5, 1)).to.be.false;
        expect(g.addEdge(5, 0)).to.be.false;
        expect(g.addEdge(4, 3)).to.be.false;
        expect(g.addEdge(4, 2)).to.be.false;
        expect(g.addEdge(4, 1)).to.be.false;
        expect(g.addEdge(4, 0)).to.be.false;
        expect(g.addEdge(3, 2)).to.be.false;
        expect(g.addEdge(3, 1)).to.be.false;
        expect(g.addEdge(3, 0)).to.be.false;
        expect(g.addEdge(2, 1)).to.be.false;
        expect(g.addEdge(2, 0)).to.be.false;
        expect(g.addEdge(1, 0)).to.be.false;
    }

    @test("should detect cycles when inserting backward edges in increasing order")
    detectCycleIncreasingInsertBackward() {
        const g = createGraph();
        expect(g.addEdge(1, 0)).to.be.true;
        expect(g.addEdge(2, 1)).to.be.true;
        expect(g.addEdge(3, 2)).to.be.true;
        expect(g.addEdge(4, 3)).to.be.true;
        expect(g.addEdge(5, 4)).to.be.true;
        expect(g.addEdge(0, 5)).to.be.false;
        expect(g.addEdge(0, 4)).to.be.false;
        expect(g.addEdge(0, 3)).to.be.false;        
        expect(g.addEdge(0, 2)).to.be.false;
        expect(g.addEdge(0, 1)).to.be.false;
        expect(g.addEdge(1, 2)).to.be.false;
        expect(g.addEdge(1, 3)).to.be.false;
        expect(g.addEdge(1, 4)).to.be.false;
        expect(g.addEdge(1, 5)).to.be.false;
        expect(g.addEdge(2, 3)).to.be.false;
        expect(g.addEdge(2, 4)).to.be.false;
        expect(g.addEdge(2, 5)).to.be.false;
        expect(g.addEdge(3, 4)).to.be.false;
        expect(g.addEdge(3, 5)).to.be.false;
        expect(g.addEdge(4, 5)).to.be.false;
    }

    @test("should detect cycles when inserting edges in decreasing order")
    detectCycleDecreasingInsert() {
        const g = createGraph();
        expect(g.addEdge(4, 5)).to.be.true;
        expect(g.addEdge(3, 4)).to.be.true;
        expect(g.addEdge(2, 3)).to.be.true;
        expect(g.addEdge(1, 2)).to.be.true;
        expect(g.addEdge(0, 1)).to.be.true;
        expect(g.addEdge(5, 4)).to.be.false;
        expect(g.addEdge(5, 3)).to.be.false;
        expect(g.addEdge(5, 2)).to.be.false;
        expect(g.addEdge(5, 1)).to.be.false;
        expect(g.addEdge(5, 0)).to.be.false;
        expect(g.addEdge(4, 3)).to.be.false;
        expect(g.addEdge(4, 2)).to.be.false;
        expect(g.addEdge(4, 1)).to.be.false;
        expect(g.addEdge(4, 0)).to.be.false;
        expect(g.addEdge(3, 2)).to.be.false;
        expect(g.addEdge(3, 1)).to.be.false;
        expect(g.addEdge(3, 0)).to.be.false;
        expect(g.addEdge(2, 1)).to.be.false;
        expect(g.addEdge(2, 0)).to.be.false;
        expect(g.addEdge(1, 0)).to.be.false;
    }

    @test("should detect cycles when inserting backward edges in decreasing order")
    detectCycleDecreasingInsertBackward() {
        const g = createGraph();
        expect(g.addEdge(5, 4)).to.be.true;
        expect(g.addEdge(4, 3)).to.be.true;
        expect(g.addEdge(3, 2)).to.be.true;
        expect(g.addEdge(2, 1)).to.be.true;
        expect(g.addEdge(1, 0)).to.be.true;
        expect(g.addEdge(0, 5)).to.be.false;
        expect(g.addEdge(0, 4)).to.be.false;
        expect(g.addEdge(0, 3)).to.be.false;        
        expect(g.addEdge(0, 2)).to.be.false;
        expect(g.addEdge(0, 1)).to.be.false;
        expect(g.addEdge(1, 2)).to.be.false;
        expect(g.addEdge(1, 3)).to.be.false;
        expect(g.addEdge(1, 4)).to.be.false;
        expect(g.addEdge(1, 5)).to.be.false;
        expect(g.addEdge(2, 3)).to.be.false;
        expect(g.addEdge(2, 4)).to.be.false;
        expect(g.addEdge(2, 5)).to.be.false;
        expect(g.addEdge(3, 4)).to.be.false;
        expect(g.addEdge(3, 5)).to.be.false;
        expect(g.addEdge(4, 5)).to.be.false;
    }

    @test("should detect 1-cycles")
    detect1Cycle() {
        const g = createGraph();
        expect(g.addEdge(0, 0)).to.be.false;
    }

    @test("should detect 2-cycles")
    detect2Cycle() {
        const g = createGraph();
        expect(g.addEdge(0, 1)).to.be.true;
        expect(g.addEdge(1, 0)).to.be.false;
    }

    @test("should detect 3-cycles")
    detect3Cycle() {
        const g = createGraph();
        expect(g.addEdge(0, 1)).to.be.true;
        expect(g.addEdge(1, 2)).to.be.true;
        expect(g.addEdge(2, 0)).to.be.false;
        expect(g.addEdge(2, 1)).to.be.false;
    }

    @test("should allow multiple edges between vertices")
    multipleEdges() {
        const g = createGraph();
        expect(g.addEdge(0, 1)).to.be.true;
        expect(g.addEdge(0, 1)).to.be.true;
    }

    @test("should pass random test")
    @timeout(10000)
    random() {
        const engine = Random.engines.mt19937();
        engine.seed(0x4213);
        for (let n = 20; n --> 0;) {
            const mygraph = createGraph();
            const yourgraph = new Graph({directed: true});
            const vertexCount = Random.integer(10, 200)(engine);
            let edgeCount = Random.integer(Math.floor(vertexCount/5), vertexCount*5)(engine);
            const chooseVertex = Random.integer(0, vertexCount - 1);
            while (edgeCount -- > 0) {
                const from = chooseVertex(engine);
                const to = chooseVertex(engine);
                if (from === to) continue;
                yourgraph.setEdge(String(from), String(to));
                const myResult = mygraph.addEdge(from, to);
                const yourResult = alg.isAcyclic(yourgraph);
                expect(myResult).to.equal(yourResult);
                // remove the offending edge that makes the graph cyclic
                if (!myResult) {
                    yourgraph.removeEdge(String(from), String(to));
                }
            }
        }
    }
}
