/* tslint:disable */

// Tests functionality not covered by PkTest

import { expect } from "chai";
import { Graph } from 'graphlib';
import { suite, test } from "mocha-typescript";
import { GraphlibAdapter } from '../main';

@suite("Graph adapter - Graphlib")
export class GraphlibAdapterTest {
    private make(): GraphlibAdapter {
        const adapter = new GraphlibAdapter();
        return adapter;
    }

    @test("should return the graphlib object")
    getGraph() {
        const g = this.make();
        expect(g.graph).to.be.an.instanceof(Graph);
    }
}
