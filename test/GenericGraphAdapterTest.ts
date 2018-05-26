/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import { CycleDetector, GenericGraphAdapter, createGraph } from '../main';

function arr<T>(it: Iterator<T>): T[] {
    const arr = [];
    for (let res = it.next(); !res.done; res = it.next()) {
        arr.push(res.value);
    }
    return arr;
}

@suite("Graph adapter - Generic")
export class GenericGraphAdapterTest {
    private make(): CycleDetector<number, GenericGraphAdapter<number>> {
        const adapter = new GenericGraphAdapter<number>();
        return createGraph({adapter});
    }

    @test("should return all vertices")
    getVertices() {
        const g = this.make();
        
        g.addVertex(0);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0]);
        
        g.addVertex(1);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1]);
        
        g.addVertex(2);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 2]);

        g.addEdge(3, 4);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 2, 3, 4]);

        g.addEdge(5, 6);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 2, 3, 4, 5, 6]);

        g.addEdge(6, 7);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7]);

        g.addEdge(0, 1);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7]);

        g.deleteVertex(2);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([0, 1, 3, 4, 5, 6, 7]);

        g.deleteVertex(0);
        expect(arr(g.unwrap().getVertices())).to.deep.equal([1, 3, 4, 5, 6, 7]);
    }

    @test("should return all edges")
    getEdges() {
        const g = this.make();
        
        g.addVertex(0);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([]);
        
        g.addVertex(1);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([]);
        
        g.addVertex(2);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([]);

        g.addEdge(3, 4);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([[3,4]]);

        g.addEdge(5, 6);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([[3,4], [5,6]]);

        g.addEdge(3, 6);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([[3,4], [3,6], [5,6]]);

        g.deleteEdge(3,4);
        expect(arr(g.unwrap().getEdges())).to.deep.equal([[3,6], [5,6]]);
    }
}
