/* tslint:disable */

import { Pair } from 'andross';
import { expect } from "chai";
import { Graph, alg } from "graphlib";
import { suite, test, timeout } from "mocha-typescript";
import * as Random from "random-js";
import { CycleDetector, GenericGraphAdapter, GraphlibAdapter, IdGraphAdapter, ObjectGraphAdapter, createGraph } from "../main";

function randomDelete(mygraph: CycleDetector<any>, yourgraph: Graph, edges: Pair<number>[], engine: Random.Engine): void {
    let edgeCount = Random.integer(1, edges.length)(engine);
    Random.shuffle(engine, edges);
    while (edgeCount -- > 0) {
        const [from, to] = edges.pop() as [number, number];
        yourgraph.removeEdge(String(from), String(to));
        mygraph.deleteEdge(from, to);
    }
}

function randomInsert(mygraph: CycleDetector<any>, yourgraph: Graph, edges: Pair<number>[], vertexCount: number, engine: Random.Engine): void {
    let edgeCount = Random.integer(Math.floor(vertexCount/5), vertexCount*5)(engine);
    let chooseVertex = Random.integer(0, vertexCount - 1);
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
        else {
            edges.push([from, to]);
        }
    }
}

export const hack: any[] = [];

[
    {
        clazz: undefined,
        make: () => createGraph(),
        convert: (vertex: number, g: CycleDetector<any>) => vertex
    },
    {
        clazz: GenericGraphAdapter,
        make: () => createGraph({adapter: new GenericGraphAdapter()}),
        convert: (vertex: number, g: CycleDetector<any>) => vertex
    },
    {
        clazz: GraphlibAdapter,
        make: () => createGraph({adapter: new GraphlibAdapter()}),
        convert: (vertex: number, g: CycleDetector<any>) => String(vertex)
    },
    {
        clazz: ObjectGraphAdapter,
        make: () => createGraph({adapter: new ObjectGraphAdapter()}),
        convert: (vertex: number, g: CycleDetector<any>) => (g as any).adapter.createVertex(),
    },
    {
        clazz: IdGraphAdapter,
        make: () => createGraph({adapter: new IdGraphAdapter()}),
        convert: (vertex: number, g: CycleDetector<any>) => (g as any).adapter.createVertex(),
    },
].forEach((adapter) => {
    // For each ID, we only create the vertex once and store it for later use.
    const r = new WeakMap<CycleDetector<any>, Map<number, any>>();
    function get(vertex: number, g: CycleDetector<any>, remove: boolean = false): any {
        const registry = r.get(g);
        if (!registry) throw new Error("no registry found");
        let v = registry.get(vertex);
        if (!v) registry.set(vertex, v = adapter.convert(vertex, g));
        if (remove) registry.delete(vertex);
        return v;
    }

    function addEdge(g: CycleDetector<any>, from: number, to: number): boolean {
        return g.addEdge(get(from, g), get(to, g));
    }

    function deleteEdge(g: CycleDetector<any>, from: number, to: number): void {
        g.deleteEdge(get(from, g, true), get(to, g, true));
    }

    function deleteVertex(g: CycleDetector<any>, vertex: number): void {
        g.deleteVertex(get(vertex, g, true));
    }

    function isReachable(g: CycleDetector<any>, from: number, to: number): boolean {
        return g.isReachable(get(from, g), get(to, g));
    }

    function make(): CycleDetector<any> {
        const g = adapter.make();
        r.set(g, new Map<number, any>());
        return g;
    }

    @suite("PkTest with adapter " + (adapter.clazz ? adapter.clazz.name : "none"))
    class PkTest {

        @test("should return the graph adapter")
        unwrap() {
            const g = make();
            if (adapter.clazz) {
                expect(g.unwrap()).to.be.an.instanceof(adapter.clazz);
            }
        }


        @test("should detect cycles when inserting edges in increasing order")
        detectCycleIncreasingInsert() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 3)).to.be.true;
            expect(addEdge(g, 3, 4)).to.be.true;
            expect(addEdge(g, 4, 5)).to.be.true;
            expect(addEdge(g, 5, 4)).to.be.false;
            expect(addEdge(g, 5, 3)).to.be.false;
            expect(addEdge(g, 5, 2)).to.be.false;
            expect(addEdge(g, 5, 1)).to.be.false;
            expect(addEdge(g, 5, 0)).to.be.false;
            expect(addEdge(g, 4, 3)).to.be.false;
            expect(addEdge(g, 4, 2)).to.be.false;
            expect(addEdge(g, 4, 1)).to.be.false;
            expect(addEdge(g, 4, 0)).to.be.false;
            expect(addEdge(g, 3, 2)).to.be.false;
            expect(addEdge(g, 3, 1)).to.be.false;
            expect(addEdge(g, 3, 0)).to.be.false;
            expect(addEdge(g, 2, 1)).to.be.false;
            expect(addEdge(g, 2, 0)).to.be.false;
            expect(addEdge(g, 1, 0)).to.be.false;
        }

        @test("should detect cycles when inserting backward edges in increasing order")
        detectCycleIncreasingInsertBackward() {
            const g = make();
            expect(addEdge(g, 1, 0)).to.be.true;
            expect(addEdge(g, 2, 1)).to.be.true;
            expect(addEdge(g, 3, 2)).to.be.true;
            expect(addEdge(g, 4, 3)).to.be.true;
            expect(addEdge(g, 5, 4)).to.be.true;
            expect(addEdge(g, 0, 5)).to.be.false;
            expect(addEdge(g, 0, 4)).to.be.false;
            expect(addEdge(g, 0, 3)).to.be.false;        
            expect(addEdge(g, 0, 2)).to.be.false;
            expect(addEdge(g, 0, 1)).to.be.false;
            expect(addEdge(g, 1, 2)).to.be.false;
            expect(addEdge(g, 1, 3)).to.be.false;
            expect(addEdge(g, 1, 4)).to.be.false;
            expect(addEdge(g, 1, 5)).to.be.false;
            expect(addEdge(g, 2, 3)).to.be.false;
            expect(addEdge(g, 2, 4)).to.be.false;
            expect(addEdge(g, 2, 5)).to.be.false;
            expect(addEdge(g, 3, 4)).to.be.false;
            expect(addEdge(g, 3, 5)).to.be.false;
            expect(addEdge(g, 4, 5)).to.be.false;
        }

        @test("should detect cycles when inserting edges in decreasing order")
        detectCycleDecreasingInsert() {
            const g = make();
            expect(addEdge(g, 4, 5)).to.be.true;
            expect(addEdge(g, 3, 4)).to.be.true;
            expect(addEdge(g, 2, 3)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 5, 4)).to.be.false;
            expect(addEdge(g, 5, 3)).to.be.false;
            expect(addEdge(g, 5, 2)).to.be.false;
            expect(addEdge(g, 5, 1)).to.be.false;
            expect(addEdge(g, 5, 0)).to.be.false;
            expect(addEdge(g, 4, 3)).to.be.false;
            expect(addEdge(g, 4, 2)).to.be.false;
            expect(addEdge(g, 4, 1)).to.be.false;
            expect(addEdge(g, 4, 0)).to.be.false;
            expect(addEdge(g, 3, 2)).to.be.false;
            expect(addEdge(g, 3, 1)).to.be.false;
            expect(addEdge(g, 3, 0)).to.be.false;
            expect(addEdge(g, 2, 1)).to.be.false;
            expect(addEdge(g, 2, 0)).to.be.false;
            expect(addEdge(g, 1, 0)).to.be.false;
        }

        @test("should detect cycles when inserting backward edges in decreasing order")
        detectCycleDecreasingInsertBackward() {
            const g = make();
            expect(addEdge(g, 5, 4)).to.be.true;
            expect(addEdge(g, 4, 3)).to.be.true;
            expect(addEdge(g, 3, 2)).to.be.true;
            expect(addEdge(g, 2, 1)).to.be.true;
            expect(addEdge(g, 1, 0)).to.be.true;
            expect(addEdge(g, 0, 5)).to.be.false;
            expect(addEdge(g, 0, 4)).to.be.false;
            expect(addEdge(g, 0, 3)).to.be.false;        
            expect(addEdge(g, 0, 2)).to.be.false;
            expect(addEdge(g, 0, 1)).to.be.false;
            expect(addEdge(g, 1, 2)).to.be.false;
            expect(addEdge(g, 1, 3)).to.be.false;
            expect(addEdge(g, 1, 4)).to.be.false;
            expect(addEdge(g, 1, 5)).to.be.false;
            expect(addEdge(g, 2, 3)).to.be.false;
            expect(addEdge(g, 2, 4)).to.be.false;
            expect(addEdge(g, 2, 5)).to.be.false;
            expect(addEdge(g, 3, 4)).to.be.false;
            expect(addEdge(g, 3, 5)).to.be.false;
            expect(addEdge(g, 4, 5)).to.be.false;
        }

        @test("should detect 1-cycles")
        detect1Cycle() {
            const g = make();
            expect(addEdge(g, 0, 0)).to.be.false;
        }

        @test("should detect 2-cycles")
        detect2Cycle() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 0)).to.be.false;
        }

        @test("should allow insertion again after deleting an edge")
        insertAfterDelete() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 0)).to.be.false;
            deleteEdge(g, 0, 1);
            expect(addEdge(g, 2, 0)).to.be.true;
        }

        @test("should allow insertion again after deleting a vertex")
        insertAfterDeleteVertex() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 0)).to.be.false;
            deleteVertex(g, 2);
            expect(addEdge(g, 2, 0)).to.be.true;
        }

        @test("should detect 3-cycles")
        detect3Cycle() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 0)).to.be.false;
            expect(addEdge(g, 2, 1)).to.be.false;
        }

        @test("should allow multiple edges between vertices")
        multipleEdges() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 0, 1)).to.be.true;
        }

        @test("should report whether vertices are reachable")
        reachable() {
            const g = make();

            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 3, 4)).to.be.true;
            expect(addEdge(g, 4, 5)).to.be.true;

            expect(isReachable(g, 0, 0)).to.be.true;
            expect(isReachable(g, 1, 1)).to.be.true;
            expect(isReachable(g, 2, 2)).to.be.true;
            expect(isReachable(g, 3, 3)).to.be.true;
            expect(isReachable(g, 4, 4)).to.be.true;
            expect(isReachable(g, 5, 5)).to.be.true;

            expect(isReachable(g, 0, 1)).to.be.true;
            expect(isReachable(g, 1, 2)).to.be.true;
            expect(isReachable(g, 0, 2)).to.be.true;

            expect(isReachable(g, 3, 4)).to.be.true;
            expect(isReachable(g, 4, 5)).to.be.true;
            expect(isReachable(g, 3, 5)).to.be.true;

            expect(isReachable(g, 1, 0)).to.be.false;
            expect(isReachable(g, 2, 0)).to.be.false;
            expect(isReachable(g, 2, 1)).to.be.false;

            expect(isReachable(g, 4, 3)).to.be.false;
            expect(isReachable(g, 5, 4)).to.be.false;
            expect(isReachable(g, 5, 3)).to.be.false;

            expect(isReachable(g, 0, 3)).to.be.false;
            expect(isReachable(g, 0, 4)).to.be.false;
            expect(isReachable(g, 0, 5)).to.be.false;
            expect(isReachable(g, 1, 3)).to.be.false;
            expect(isReachable(g, 1, 4)).to.be.false;
            expect(isReachable(g, 1, 5)).to.be.false;
            expect(isReachable(g, 2, 3)).to.be.false;
            expect(isReachable(g, 2, 4)).to.be.false;
            expect(isReachable(g, 2, 5)).to.be.false;

            expect(isReachable(g, 3, 0)).to.be.false;
            expect(isReachable(g, 3, 1)).to.be.false;
            expect(isReachable(g, 3, 2)).to.be.false;
            expect(isReachable(g, 4, 0)).to.be.false;
            expect(isReachable(g, 4, 1)).to.be.false;
            expect(isReachable(g, 4, 2)).to.be.false;
            expect(isReachable(g, 5, 0)).to.be.false;
            expect(isReachable(g, 5, 1)).to.be.false;
            expect(isReachable(g, 5, 2)).to.be.false;
        }

        @test("should pass random test")
        @timeout(10000)
        random() {
            const engine = Random.engines.mt19937();
            engine.seed(0x4213);
            for (let n = 20; n --> 0;) {
                const mygraph = createGraph();
                const yourgraph = new Graph({directed: true});
                const vertexCount = n * 10 + 10;
                const edges: Pair<number>[] = [];

                // Inserts and deletes
                randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
                randomDelete(mygraph, yourgraph, edges, engine);
                randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
                randomDelete(mygraph, yourgraph, edges, engine);
                randomInsert(mygraph, yourgraph, edges, vertexCount, engine);
            }
        }
    }

    hack.push(PkTest);
});
