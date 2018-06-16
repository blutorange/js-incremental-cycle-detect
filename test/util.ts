/* tslint:disable */
import { expect } from "chai";
import { ClonableAdapter, CommonAdapter } from "../src/Header";

export function assertOrder(mygraph: CommonAdapter<any>) {
    /*
    let min = Number.MAX_SAFE_INTEGER;
    let max = Number.MIN_SAFE_INTEGER;
    */
    if (mygraph.supportsOrder()) {
        for (let it = mygraph.getEdges(), res = it.next(); !res.done; res = it.next()) {
            const from = res.value[0];
            const to = res.value[1];
            expect(mygraph.getOrder(from)).to.be.lessThan(mygraph.getOrder(to));
        }
        /*
        for (let it = mygraph.getVertices(), res = it.next(); !res.done; res = it.next()) {
            const o = mygraph.getOrder(res.value);
            min = Math.min(min, o);
            max = Math.max(max, o);
        }
        */
    }
    /*
    if (min !== Number.MAX_SAFE_INTEGER) {
        expect(min).to.equal(0);
        expect(max).to.equal(mygraph.getVertexCount() - 1);
    }
    else {
        expect(mygraph.getVertexCount()).to.equal(0);
    }
    */
}

export function edgeSorter4(lhs: [any, any, any, any], rhs: [any, any, any, any]): number {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    if (lhs[1] < rhs[1]) return -1;
    if (lhs[1] > rhs[1]) return 1;
    if (lhs[2] < rhs[2]) return -1;
    if (lhs[2] > rhs[2]) return 1;
    if (lhs[3] < rhs[3]) return -1;
    if (lhs[3] > rhs[3]) return 1;
    return 0;
}

export function edgeSorter3(lhs: [any, any, any], rhs: [any,any,any]): number {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    if (lhs[1] < rhs[1]) return -1;
    if (lhs[1] > rhs[1]) return 1;
    if (lhs[2] < rhs[2]) return -1;
    if (lhs[2] > rhs[2]) return 1;
    return 0;
}

export function edgeSorter2(lhs: [any, any], rhs: [any, any]): number {
    if (lhs[0] < rhs[0]) return -1;
    if (lhs[0] > rhs[0]) return 1;
    if (lhs[1] < rhs[1]) return -1;
    if (lhs[1] > rhs[1]) return 1;
    return 0;
}

export function isClonable(g: any): g is ClonableAdapter<any, any> {
    return "clone" in g;
}