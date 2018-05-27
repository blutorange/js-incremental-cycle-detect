import { CycleDetector, GraphAdapter } from "./Header";
import { VertexData } from "./InternalHeader";

/*
 * Based on the paper
 * A Dynamic Topological Sort Algorithm for Directed Acyclic Graphs
 *   DAVID J. PEARCE / PAUL H. J. KELLY
 *   Journal of Experimental Algorithmics (JEA)
 *   Volume 11, 2006, Article No. 1.7
 *   ACM New York, NY, USA
 */

/**
 * Performs a merge sort step of two arrays, with the actual array value stored
 * in the key property of the array item.
 */
function merge<TVertex>(adapter: GraphAdapter<TVertex>, arr1: TVertex[], arr2: TVertex[]): number[] {
    const res: number[] = [];
    const len1 = arr1.length;
    const len2 = arr2.length;
    let i1 = 0;
    let i2 = 0;
    // Push the smaller value from both arrays to the result
    // as long as there remains at least one element in one
    // array.
    while ((i1 < len1) && (i2 < len2)) {
        const o1 = adapter.getData(arr1[i1]).order;
        const o2 = adapter.getData(arr2[i2]).order;
        if (o1 < o2) {
            i1 += 1;
            res.push(o1);
        }
        else {
            i2 += 1;
            res.push(o2);
        }
    }
    // Push the remaining elements, if any, to the result.
    while (i1 < len1) {
        const o1 = adapter.getData(arr1[i1]);
        i1 += 1;
        res.push(o1.order);
    }
    while (i2 < len2) {
        const o2 = adapter.getData(arr2[i2]);
        i2 += 1;
        res.push(o2.order);
    }
    // Return sorted array.
    return res;
}

function sort<TVertex>(adapter: GraphAdapter<TVertex>, vertices: TVertex[]): TVertex[] {
    // Sort by topological order.
    return vertices.map(v => ({key: adapter.getData(v).order,  val: v})).sort((v1, v2) => v1.key - v2.key).map(v => v.val);
}

export class PearceKellyDetector<TVertex> implements CycleDetector<TVertex> {
    private id: number;
    private stack: TVertex[];
    private deltaXyF: TVertex[];
    private deltaXyB: TVertex[];

    constructor() {
        this.id = 0;
        this.stack = [];
        this.deltaXyB = [];
        this.deltaXyF = [];
    }

    isReachable(adapter: GraphAdapter<TVertex>, source: TVertex, target: TVertex): boolean {
        // Search for the target from the source. Only checks vertices whose
        // toplogical order is between the source and target.
        if (source === target) {
            return true;
        }

        const tOrder = adapter.getData(target).order;
        if (adapter.getData(source).order > tOrder) {
            // target cannot be reached by source as source is sorted after target topologically
            return false;
        }

        const reachable = !this.dfs_f(source, adapter, tOrder);
        if (reachable) {
            this.cleanAfterCycle(adapter);
        }

        return reachable;
    }

    createVertexData(g: GraphAdapter<TVertex>, vertex: TVertex): VertexData<any> {
        return {
            custom: undefined,
            order: this.id++,
            visited: false,
        };
    }

    canAddEdge(g: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean {
        return this.checkCycle(g, from, to);
    }

    canContractEdge(g: GraphAdapter<TVertex>, from: TVertex, to: TVertex): boolean {
        throw new Error("Method not implemented.");
    }

    private checkCycle(adapter: GraphAdapter<TVertex>, x: TVertex, y: TVertex): boolean {
        const lb = adapter.getData(y).order;
        const ub = adapter.getData(x).order;
        this.deltaXyB = [];
        this.deltaXyF = [];
        if (lb < ub) {
            // Discovery
            if (!this.dfs_f(y, adapter, ub)) {
                this.cleanAfterCycle(adapter);
                return false;
            }
            this.dfs_b(x, adapter, lb);
            // Reassignment
            this.reorder(adapter);
        }
        return true;
    }

    private cleanAfterCycle(adapter: GraphAdapter<TVertex>) {
        this.stack = [];
        for (let n = this.deltaXyF.pop(); n !== undefined; n = this.deltaXyF.pop()) {
            (adapter.getData(n) as VertexData).visited = false;
        }
    }

    private dfs_f(first: TVertex, adapter: GraphAdapter<TVertex>, ub: number): boolean {
        this.stack.push(first);
        while (this.stack.length > 0) {
            const n = this.stack.pop() as TVertex;
            const nData = adapter.getData(n) as VertexData;
            if (nData.visited) {
                continue;
            }
            nData.visited = true;
            this.deltaXyF.push(n);
            for (let it = adapter.getSuccessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                const wData = adapter.getData(res.value);
                if (wData.order === ub) {
                    // cycle
                    return false;
                }
                // is w unvisited and in affected region?
                if (!wData.visited && wData.order < ub) {
                    this.stack.push(res.value);
                }
            }
        }
        return true;
    }

    private dfs_b(first: TVertex, adapter: GraphAdapter<TVertex>, lb: number): void {
        this.stack.push(first);
        while (this.stack.length > 0) {
            const n = this.stack.pop() as TVertex;
            const nData = adapter.getData(n);
            if (nData.visited) {
                continue;
            }
            (nData as VertexData).visited = true;
            this.deltaXyB.push(n);
            for (let it = adapter.getPredecessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                // is w unvisited and in affected region?
                const wData = adapter.getData(res.value);
                if (!wData.visited && lb < wData.order) {
                    this.stack.push(res.value);
                }
            }
        }
    }


    private reorder(adapter: GraphAdapter<TVertex>) {
        // sort sets to preserve original order of elements
        this.deltaXyB = sort(adapter, this.deltaXyB);
        this.deltaXyF = sort(adapter, this.deltaXyF);

        // Load delta_xy_b onto array L first
        // Now load delta_xy_f onto array L
        const L: TVertex[] = this.deltaXyB.concat(this.deltaXyF);
        for (const w of L) {
            (adapter.getData(w) as VertexData).visited = false;
        }

        const R: number[] = merge(adapter, this.deltaXyB, this.deltaXyF);

        // allocate vertices in L starting from lowest
        for (let i = 0, j = L.length; i < j; ++i) {
            (adapter.getData(L[i]) as VertexData).order = R[i];
        }
    }
}


    /*
    contractEdge(from: TVertex, to: TVertex): boolean {
        if (!this.hasEdge(from, to)) {
            return false;
        }

        this.deleteEdge(from, to);

        // If target is still reachable after removing the edge(s) between source
        // and target, merging both vertices results in a cycle.
        if (this.listener.isReachable(this, from, to)) {
            this.addEdge(from, to);
            return false;
        }

        const succ = [];
        const pred = [];

        // Remove all edges from the second vertex.
        for (let it = this.getSuccessorsOf(to), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(to, res.value);
            succ.push(res.value);
        }

        for (let it = this.getPredecessorsOf(to), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, to);
            pred.push(res.value);
        }

        // Add all the removed edges to the first vertex.
        for (const node of succ) {
            this.addEdge(from, node);
        }
        for (const node of pred) {
            this.addEdge(node, from);
        }

        // Finally delete the second vertex. Now the edge is contracted.
        this.deleteVertex(to);

        return true;
    }
    */
