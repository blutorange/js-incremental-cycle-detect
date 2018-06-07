import { expect } from "chai";
import { CommonAdapter } from "../src/Header";

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
