/* tslint:disable */

import { BinaryOperator, Pair } from 'andross';
import { expect } from "chai";
import { Graph, alg } from "graphlib";
import { suite, test, timeout } from "mocha-typescript";
import * as Random from "random-js";
import { CommonAdapter, GenericGraphAdapter, GraphlibAdapter, MultiGraphAdapter } from "../index";

const log = false;

function toArray<T>(it: Iterator<T>): T[] {
    const arr = [];
    for (let res = it.next(); !res.done; res = it.next()) {
        arr.push(res.value);
    }
    return arr;
}

export const hack: any[] = [];

[
    {
        clazz: GenericGraphAdapter,
        make: () => new GenericGraphAdapter(),
        convert: (vertex: number) => vertex
    },
    {
        clazz: MultiGraphAdapter,
        make: () => new MultiGraphAdapter(),
        convert: (vertex: number) => vertex,
    },
    {
        clazz: GraphlibAdapter,
        make: () => new GraphlibAdapter({graphlib: Graph}),
        convert: (vertex: number) => String(vertex)
    },
].forEach((adapter) => {
    // For each ID, we only create the vertex once and store it for later use.
    let id = 0;
    const r = new WeakMap<CommonAdapter<any>, Map<number, any>>();
    function get(g: CommonAdapter<any>, vertex: number, remove: boolean = false): any {
        const registry = r.get(g);
        if (!registry) throw new Error("no registry found");
        let v = registry.get(vertex);
        if (v === undefined && remove) throw new Error("vertex not found: " + vertex);
        if (v === undefined) registry.set(vertex, v = adapter.convert(vertex));
        if (remove) registry.delete(vertex);
        return v;
    }

    function has(g: CommonAdapter<any>, vertex: number): any {
        const registry = r.get(g);
        if (!registry) throw new Error("no registry found");
        let v = registry.get(vertex);
        return v !== undefined;
    }

    function edgeSorter(lhs: number[], rhs: number[]): number {
        if (lhs[0] === rhs[0]) return lhs[1] - rhs[1];
        return lhs[0] - rhs[0];
    }

    function vertexIdentifier(v: any): any {
        if (typeof v === "object") {
            if (v.__id === undefined) v.__id = id++;
            return v.__id;
        }
        return v;
    }

    function expectEdgesToEqual(g: CommonAdapter<any>, should: Pair<number>[]) {
        const is = toArray(g.getEdges());
        const ismapped = is.map(v => [vertexIdentifier(v[0]), vertexIdentifier(v[1])]);
        const shouldmapped = should.map(v => [vertexIdentifier(get(g, v[0])), vertexIdentifier(get(g, v[1]))]);
        ismapped.sort(edgeSorter);
        shouldmapped.sort(edgeSorter);
        expect(ismapped).to.deep.equal(shouldmapped);
    }

    function expectVerticesToEqual(g: CommonAdapter<any>, should: number[]) {
        const is = toArray(g.getVertices());
        const ismapped = is.map(v => vertexIdentifier(v));
        const shouldmapped = should.map(v => vertexIdentifier(get(g, v)));
        ismapped.sort();
        shouldmapped.sort();
        expect(ismapped).to.deep.equal(shouldmapped);
    }

    function addEdge(g: CommonAdapter<any>, from: number, to: number, data?: any): boolean {
        const f = get(g, from);
        const t = get(g, to);
        return g.addEdge(f, t, data);
    }

    function addVertex(g: CommonAdapter<any>, vertex: number): boolean {
        const v = get(g, vertex);
        return g.addVertex(v);
    }

    function contractEdge(g: CommonAdapter<any>, from: number, to: number, newVertex?: number, edgeMerger?: BinaryOperator<any>): boolean {
        const f = get(g, from);
        const t = get(g, to);
        if (newVertex !== undefined) {
            const n = get(g, newVertex);
            return g.contractEdge(f, t, () => n, edgeMerger);
        }
        else {
            return g.contractEdge(f, t, undefined, edgeMerger);
        }
    }

    function hasEdge(g: CommonAdapter<any>, from: number, to: number): boolean {
        return g.hasEdge(get(g, from), get(g, to));
    }

    function hasVertex(g: CommonAdapter<any>, vertex: number): boolean {
        const exists = has(g, vertex);
        if (!exists) {
            return false;
        }
        return g.hasVertex(get(g, vertex));
    }

    function deleteEdge(g: CommonAdapter<any>, from: number, to: number): boolean {
        return g.deleteEdge(get(g, from), get(g, to));
    }

    function deleteVertex(g: CommonAdapter<any>, vertex: number): boolean {
        return g.deleteVertex(get(g, vertex, true));
    }

    function isReachable(g: CommonAdapter<any>, from: number, to: number): boolean {
        return g.isReachable(get(g, from), get(g, to));
    }

    function make<TVertex = any>(): CommonAdapter<any> {
        const g = adapter.make();
        r.set(g, new Map<number, any>());
        return g;
    }

    function getEdgeData(g: CommonAdapter<any>, from: number, to: number): any {
        return g.getEdgeData(get(g, from), get(g, to));
    }

    function setEdgeData(g: CommonAdapter<any>, from: number, to: number, data: any): boolean {
        return g.setEdgeData(get(g, from), get(g, to), data);
    }

    function randomDelete(mygraph: CommonAdapter<any>, yourgraph: Graph, edges: Pair<number>[], engine: Random.Engine): void {
        if (log) console.log("\n// ===begin delete");
        let edgeCount = Random.integer(1, edges.length)(engine);
        Random.shuffle(engine, edges);
        while (edgeCount -- > 0) {
            const [from, to] = edges.pop() as [number, number];
            if (log) console.log("g.deleteEdge(get(" + from + "), get(" + to + "));");
            yourgraph.removeEdge(String(from), String(to));
            deleteEdge(mygraph, from, to);
        }
        assertOrder(mygraph);
    }

    function assertOrder(mygraph: CommonAdapter<any>) {
        if (mygraph.supportsOrder()) {
            for (let it = mygraph.getEdges(), res = it.next(); !res.done; res = it.next()) {
                const from = res.value[0];
                const to = res.value[1];
                expect(mygraph.getOrder(from)).to.be.lessThan(mygraph.getOrder(to));
            }
        }
    }
    
    function randomInsert(mygraph: CommonAdapter<any>, yourgraph: Graph, edges: Pair<number>[], vertexCount: number, engine: Random.Engine): void {
        if (log) console.log("\n/// ===begin insert");
        let edgeCount = Random.integer(Math.floor(vertexCount/5), vertexCount*5)(engine);
        let chooseVertex = Random.integer(0, vertexCount - 1);
        while (edgeCount -- > 0) {
            const from = chooseVertex(engine);
            const to = chooseVertex(engine);
            const myHasEdge = hasEdge(mygraph, from, to);
            const yourHasEdge = yourgraph.hasEdge(String(from), String(to));
            expect(myHasEdge).to.equal(yourHasEdge);
            if (from === to || myHasEdge) continue;
            yourgraph.setEdge(String(from), String(to));
            const myResult = addEdge(mygraph, from, to);
            const yourResult = alg.isAcyclic(yourgraph);
            if (log) console.log("expect(addEdge(g, get(" + from + "), get(" + to + "))).to.be." + yourResult + "; // is " + myResult);
            expect(myResult).to.equal(yourResult);
            // remove the offending edge that makes the graph cyclic
            if (!myResult) {
                yourgraph.removeEdge(String(from), String(to));
            }
            else {
                edges.push([from, to]);
            }
        }
        assertOrder(mygraph);
    }

    @suite("PkTest with adapter " + (adapter.clazz ? adapter.clazz.name : "none"))
    class PkTest {

        @test("should have created the instance")
        basic() {
            if (adapter.clazz) {
                expect(make()).to.be.an.instanceof(adapter.clazz);
            }
        }

        @test("should allow associating edge source/target data")
        edgeData() {
            const g = make();
            g.addEdge(0, 1, "foo");
            g.addEdge(0, 2, undefined);
            g.addEdge(1, 2, "bar");
            expect(getEdgeData(g, 0, 1)).to.equal("foo");
            expect(getEdgeData(g, 0, 2)).to.be.undefined;
            expect(getEdgeData(g, 1, 2)).to.equal("bar");
            expect(getEdgeData(g, 1, 0)).to.be.undefined;
            expect(getEdgeData(g, 2, 0)).to.be.undefined;
            expect(getEdgeData(g, 2, 1)).to.be.undefined;
            expect(setEdgeData(g, 0, 1, "foobar")).to.be.true;
            expect(getEdgeData(g, 0, 1)).to.equal("foobar");
            expect(setEdgeData(g, 0, 3, "baz")).to.be.false;
            expect(addVertex(g, 3)).to.be.true;
            expect(setEdgeData(g, 1, 3, "baz")).to.be.false;
        }

        @test("should return all vertices and their count")
        getVertices() {
            const g = make();

            expect(g.getVertexCount()).to.equal(0);
            expect(hasVertex(g, 0)).to.be.false;
            expect(hasVertex(g, 1)).to.be.false;
            expect(hasVertex(g, 2)).to.be.false;
            expect(hasVertex(g, 3)).to.be.false;
            expect(hasVertex(g, 4)).to.be.false;
            expect(hasVertex(g, 5)).to.be.false;
            expect(hasVertex(g, 6)).to.be.false;
            expect(hasVertex(g, 7)).to.be.false;
            
            addVertex(g, 0);
            expectVerticesToEqual(g, [0]);
            expect(g.getVertexCount()).to.equal(1);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.false;
            expect(hasVertex(g, 2)).to.be.false;
            expect(hasVertex(g, 3)).to.be.false;
            expect(hasVertex(g, 4)).to.be.false;
            expect(hasVertex(g, 5)).to.be.false;
            expect(hasVertex(g, 6)).to.be.false;
            expect(hasVertex(g, 7)).to.be.false;
            
            addVertex(g, 1);
            expectVerticesToEqual(g, [0, 1]);
            expect(g.getVertexCount()).to.equal(2);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.false;
            expect(hasVertex(g, 3)).to.be.false;
            expect(hasVertex(g, 4)).to.be.false;
            expect(hasVertex(g, 5)).to.be.false;
            expect(hasVertex(g, 6)).to.be.false;
            expect(hasVertex(g, 7)).to.be.false;
            
            addVertex(g, 2);
            expectVerticesToEqual(g, [0, 1, 2]);
            expect(g.getVertexCount()).to.equal(3);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.true;
            expect(hasVertex(g, 3)).to.be.false;
            expect(hasVertex(g, 4)).to.be.false;
            expect(hasVertex(g, 5)).to.be.false;
            expect(hasVertex(g, 6)).to.be.false;
            expect(hasVertex(g, 7)).to.be.false;
    
            addEdge(g, 3, 4);
            expectVerticesToEqual(g, [0, 1, 2, 3, 4]);
            expect(g.getVertexCount()).to.equal(5);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.true;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.false;
            expect(hasVertex(g, 6)).to.be.false;
            expect(hasVertex(g, 7)).to.be.false;

            addEdge(g, 5, 6);
            expectVerticesToEqual(g, [0, 1, 2, 3, 4, 5, 6]);
            expect(g.getVertexCount()).to.equal(7);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.true;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.true;
            expect(hasVertex(g, 6)).to.be.true;
            expect(hasVertex(g, 7)).to.be.false;
    
            addEdge(g, 6, 7);
            expectVerticesToEqual(g, [0, 1, 2, 3, 4, 5, 6, 7]);
            expect(g.getVertexCount()).to.equal(8);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.true;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.true;
            expect(hasVertex(g, 6)).to.be.true;
            expect(hasVertex(g, 7)).to.be.true;

            addEdge(g, 0, 1);
            expectVerticesToEqual(g, [0, 1, 2, 3, 4, 5, 6, 7]);
            expect(g.getVertexCount()).to.equal(8);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.true;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.true;
            expect(hasVertex(g, 6)).to.be.true;
            expect(hasVertex(g, 7)).to.be.true;
    
            deleteVertex(g, 2);
            expectVerticesToEqual(g, [0, 1, 3, 4, 5, 6, 7]);
            expect(g.getVertexCount()).to.equal(7);
            expect(hasVertex(g, 0)).to.be.true;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.false;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.true;
            expect(hasVertex(g, 6)).to.be.true;
            expect(hasVertex(g, 7)).to.be.true;
            
            deleteVertex(g, 0);
            expectVerticesToEqual(g, [1, 3, 4, 5, 6, 7]);
            expect(g.getVertexCount()).to.equal(6);
            expect(hasVertex(g, 0)).to.be.false;
            expect(hasVertex(g, 1)).to.be.true;
            expect(hasVertex(g, 2)).to.be.false;
            expect(hasVertex(g, 3)).to.be.true;
            expect(hasVertex(g, 4)).to.be.true;
            expect(hasVertex(g, 5)).to.be.true;
            expect(hasVertex(g, 6)).to.be.true;
            expect(hasVertex(g, 7)).to.be.true;
        }

        @test("should return all edges and their count")
        getEdges() {
            const g = make();

            expect(g.getEdgeCount()).to.equal(0);
            
            addVertex(g, 0);
            expectEdgesToEqual(g, []);
            expect(g.getEdgeCount()).to.equal(0);
            expect(hasEdge(g, 0, 1)).to.be.false;
            
            addVertex(g, 1);
            expectEdgesToEqual(g, []);
            expect(g.getEdgeCount()).to.equal(0);
            expect(hasEdge(g, 0, 1)).to.be.false;
            
            addVertex(g, 2);
            expectEdgesToEqual(g, []);
            expect(g.getEdgeCount()).to.equal(0);
            expect(hasEdge(g, 0, 1)).to.be.false;
    
            addEdge(g, 3, 4);
            expectEdgesToEqual(g, [[3,4]]);
            expect(g.getEdgeCount()).to.equal(1);
            expect(hasEdge(g, 3, 4)).to.be.true;
    
            addEdge(g, 5, 6);
            expectEdgesToEqual(g, [[3,4], [5,6]]);
            expect(g.getEdgeCount()).to.equal(2);
            expect(hasEdge(g, 3, 4)).to.be.true;
            expect(hasEdge(g, 5, 6)).to.be.true;
    
            addEdge(g, 3, 6);
            expectEdgesToEqual(g, [[3,4], [3,6], [5,6]]);
            expect(g.getEdgeCount()).to.equal(3);
            expect(hasEdge(g, 3, 4)).to.be.true;
            expect(hasEdge(g, 3, 6)).to.be.true;
            expect(hasEdge(g, 5, 6)).to.be.true;
    
            deleteEdge(g, 3, 4);
            expectEdgesToEqual(g, [[3,6], [5,6]]);
            expect(g.getEdgeCount()).to.equal(2);
            expect(hasEdge(g, 3, 4)).to.be.false;
            expect(hasEdge(g, 3, 6)).to.be.true;
            expect(hasEdge(g, 5, 6)).to.be.true;
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

        @test("should detect 3-cycles")
        detect3Cycle() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 0)).to.be.false;
            expect(addEdge(g, 2, 1)).to.be.false;
        }

        @test("should merge the edge data when contracting")
        edgeContractionMerge() {
            const g = make();
            expect(addEdge(g, 1, 2, 3)).to.be.true;
            expect(addEdge(g, 1, 3, 5)).to.be.true;
            
            expect(addEdge(g, 2, 3, -1)).to.be.true;

            expect(addEdge(g, 2, 5, 11)).to.be.true;
            expect(addEdge(g, 3, 5, 13)).to.be.true;

            expect(contractEdge(g, 2, 3, 42, (first, second) => {
                return first + second;
            })).to.be.true;
            
            expect(getEdgeData(g, 1, 42)).to.equal(8);
            expect(getEdgeData(g, 42, 5)).to.equal(24);
        }

        @test("should check whether edge contraction is allowed")
        edgeContraction() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 1, 2)).to.be.true;
            expect(addEdge(g, 2, 3)).to.be.true;
            expect(addEdge(g, 3, 4)).to.be.true;
            expect(addEdge(g, 5, 4)).to.be.true;

            expect(addEdge(g, 0, 2)).to.be.true;
            expect(addEdge(g, 0, 3)).to.be.true;
            expect(addEdge(g, 0, 4)).to.be.true;
            expect(addEdge(g, 2, 4)).to.be.true;
            expect(contractEdge(g, 0, 2)).to.be.false;
            expect(contractEdge(g, 2, 0)).to.be.false;
            expect(contractEdge(g, 0, 3)).to.be.false;
            expect(contractEdge(g, 3, 0)).to.be.false;
            expect(contractEdge(g, 0, 4)).to.be.false;
            expect(contractEdge(g, 4, 0)).to.be.false;
            expect(contractEdge(g, 1, 3)).to.be.false;
            expect(contractEdge(g, 3, 1)).to.be.false;
            expect(contractEdge(g, 1, 4)).to.be.false;
            expect(contractEdge(g, 4, 1)).to.be.false;
            expect(contractEdge(g, 2, 4)).to.be.false;
            expect(contractEdge(g, 4, 2)).to.be.false;
            deleteEdge(g, 0, 2);
            deleteEdge(g, 0, 3);
            deleteEdge(g, 0, 4);
            deleteEdge(g, 2, 4);

            expect(() => contractEdge(g, 0, 1, 2)).to.throw();
            expect(contractEdge(g, 0, 1)).to.be.true;
            expect(contractEdge(g, 2, 3)).to.be.true;
            expect(contractEdge(g, 0, 2)).to.be.true;
            expect(contractEdge(g, 0, 4)).to.be.true;
            expect(contractEdge(g, 5, 0, 9)).to.be.true;
            expect(hasVertex(g, 9)).to.be.true;
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

        @test("should not inserted edge if it exists")
        insertExistingEdge() {
            const g = make();
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(addEdge(g, 0, 1)).to.be.false;
        }

        @test("should not inserted vertex if it exists")
        insertExistingVertex() {
            const g = make();
            expect(addVertex(g, 0)).to.be.true;
            expect(addVertex(g, 0)).to.be.false;
        }

        @test("should not delete edge if it does not exist")
        deleteNonExistingEdge() {
            const g = make();
            expect(deleteEdge(g, 0, 1)).to.be.false;
            expect(addEdge(g, 0, 1)).to.be.true;
            expect(deleteEdge(g, 0, 1)).to.be.true;
            expect(deleteEdge(g, 0, 1)).to.be.false;
        }

        @test("should not delete vertex if it does not exist")
        deleteNonExistingVertex() {
            const g = make();
            expect(addVertex(g, 0)).to.be.true;
            const v = get(g, 0);
            expect(g.deleteVertex(v)).to.be.true;
            expect(g.deleteVertex(v)).to.be.false;
        }
        
        @test("should not do anything when edge exists already")
        addExistingEdge() {
            const g = make();
            expect(addEdge(g, 1, 2, "foo")).to.be.true;
            expect(getEdgeData(g, 1, 2)).to.equal("foo");
            expect(addEdge(g, 1, 2, "bar")).to.be.false;
            expect(getEdgeData(g, 1, 2)).to.equal("foo");
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
                const mygraph = make();
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
