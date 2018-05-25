import { Algo, GraphAdapter } from "./Header";
import { PkVertexData } from "./PkHeader";

/**
 * Performs a merge sort of two arrays, with the actual array value stored
 * in the key property of the array item.
 */
function tkMerge<TVertex>(adapter: GraphAdapter<TVertex, PkVertexData>, arr1: TVertex[], arr2: TVertex[]): number[] {
    const res: number[] = [];
    const len1 = arr1.length;
    const len2 = arr2.length;
    let i1 = 0;
    let i2 = 0;
    // Push the smaller value from both arrays to the result
    // as long as there remains at least one element in one
    // array.
    while (i1 < len1 && i2 < len2) {
        const o1 = adapter.getData(arr1[i1]);
        const o2 = adapter.getData(arr2[i2]);
        if (o1 < o2) {
            i1 += 1;
            res.push(o1.order);
        }
        else {
            i2 += 1;
            res.push(o2.order);
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

export class PkImpl<TVertex> implements Algo<TVertex, PkVertexData> {
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

    createVertex(adapter: GraphAdapter<TVertex, PkVertexData>, vertex: TVertex): PkVertexData {
        const id = this.id++;
        return {
            order: id,
            visited: false,
        };
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        // no-op
    }

    deleteVertex(adapter: GraphAdapter<TVertex, PkVertexData>, vertex: TVertex) {
        // no-op
    }

    addEdge(adapter: GraphAdapter<TVertex, PkVertexData>, x: TVertex, y: TVertex): boolean {
        const lb = adapter.getData(y).order;
        const ub = adapter.getData(x).order;
        this.deltaXyB = [];
        this.deltaXyF = [];
        if (lb < ub) {
            // Discovery
            if (!this.dfs_f(y, adapter, ub)) {
                return false;
            }
            this.dfs_b(x, adapter, lb);
            // Reassignment
            this.reorder(adapter);
        }
        return true;
    }

    private dfs_f(first: TVertex, adapter: GraphAdapter<TVertex, PkVertexData>, ub: number): boolean {
        this.stack.push(first);
        while (this.stack.length > 0) {
            const n = this.stack.pop() as TVertex;
            adapter.getData(n).visited = true;
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

    private dfs_b(first: TVertex, adapter: GraphAdapter<TVertex, PkVertexData>, lb: number): void {
        this.stack.push(first);
        while (this.stack.length > 0) {
            const n = this.stack.pop() as TVertex;
            adapter.getData(n).visited = true;
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

    private sort(adapter: GraphAdapter<TVertex, PkVertexData>, vertices: TVertex[]): TVertex[] {
        // Sort by topological order.
        return vertices.map(v => ({key: adapter.getData(v).order,  val: v})).sort((v1, v2) => v1.key - v2.key).map(v => v.val);
    }

    private reorder(adapter: GraphAdapter<TVertex, PkVertexData>) {
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
