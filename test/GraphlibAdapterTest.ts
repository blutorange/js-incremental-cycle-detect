/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { Graph } from 'graphlib';
import { suite, test } from "mocha-typescript";
import { CycleDetector, GraphlibAdapter, createGraph } from '../main';

@suite("Graph adapter - Graphlib")
export class GraphlibAdapterTest {
    private make(): CycleDetector<string, GraphlibAdapter> {
        const adapter = new GraphlibAdapter();
        return createGraph({adapter});
    }

    @test("should return the graphlib object")
    getGraph() {
        const g = this.make();
        expect(g.unwrap().graph).to.be.an.instanceof(Graph);
    }
}
