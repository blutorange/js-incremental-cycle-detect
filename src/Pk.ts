import { Algo, GraphAdapter } from "./Header";
import { PkVertexData } from "./PkHeader";

/*
 * Based on the paper
 * A Dynamic Topological Sort Algorithm for Directed Acyclic Graphs
 *   DAVID J. PEARCE / PAUL H. J. KELLY
 *   Journal of Experimental Algorithmics (JEA)
 *   Volume 11, 2006, Article No. 1.7
 *   ACM New York, NY, USA
 */

/**
 * Performs a merge sort of two arrays, with the actual array value stored
 * in the key property of the array item.
 */
function tkMerge<TVertex>(adapter: GraphAdapter<TVertex>, arr1: TVertex[], arr2: TVertex[]): number[] {
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

export class PkImpl<TVertex> implements Algo<TVertex> {
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

    createVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex): PkVertexData {
        const id = this.id++;
        return {
            order: id,
            visited: false,
        };
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        // no-op
    }

    deleteVertex(adapter: GraphAdapter<TVertex>, vertex: TVertex) {
        // no-op
    }

    addEdge(adapter: GraphAdapter<TVertex>, x: TVertex, y: TVertex): boolean {
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

    isReachable(source: TVertex, target: TVertex, adapter: GraphAdapter<TVertex>): boolean {
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

    private cleanAfterCycle(adapter: GraphAdapter<TVertex>) {
        this.stack = [];
        for (let n = this.deltaXyF.pop(); n !== undefined; n = this.deltaXyF.pop()) {
            adapter.getData(n).visited = false;
        }
    }

    private dfs_f(first: TVertex, adapter: GraphAdapter<TVertex>, ub: number): boolean {
        this.stack.push(first);
        while (this.stack.length > 0) {
            const n = this.stack.pop() as TVertex;
            const nData = adapter.getData(n);
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
            nData.visited = true;
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

    private sort(adapter: GraphAdapter<TVertex>, vertices: TVertex[]): TVertex[] {
        // Sort by topological order.
        return vertices.map(v => ({key: adapter.getData(v).order,  val: v})).sort((v1, v2) => v1.key - v2.key).map(v => v.val);
    }

    private reorder(adapter: GraphAdapter<TVertex>) {
        // sort sets to preserve original order of elements
        this.deltaXyB = this.sort(adapter, this.deltaXyB);
        this.deltaXyF = this.sort(adapter, this.deltaXyF);

        // Load delta_xy_b onto array L first
        // Now load delta_xy_f onto array L
        const L: TVertex[] = this.deltaXyB.concat(this.deltaXyF);
        for (const w of L) {
            adapter.getData(w).visited = false;
        }

        const R: number[] = tkMerge(adapter, this.deltaXyB, this.deltaXyF);

        // allocate vertices in L starting from lowest
        for (let i = 0, j = L.length; i < j; ++i) {
            adapter.getData(L[i]).order = R[i];
        }
    }
}
