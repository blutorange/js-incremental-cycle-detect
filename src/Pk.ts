import { KeyValueEntry } from 'andross';
import { PkVertexData } from './PkHeader';
import { GraphAdapter, Algo, ArrayFrom } from './Header';

/**
 * Performs a merge sort of two arrays, with the actual array value stored
 * in the key property of the array item.
 */
function tkMerge(arr1: KeyValueEntry<number, any>[], arr2: KeyValueEntry<number, any>[]): number[] {
    const res: number[] = [];
    const len1 = arr1.length;
    const len2 = arr2.length;
    let i1 = 0;
    let i2 = 0;
    // Push the smaller value from both arrays to the result
    // as long as there remains at least one element in one
    // array.
    while (i1 < len1 && i2 < len2) {
        if (arr1[i1] < arr2[i2]) res.push(arr1[i1++].key);
        else res.push(arr2[i2++].key);
    }
    // Push the remaining elements, if any, to the result.
    while (i1 < len1) res.push(arr1[i1++].key);
    while (i2 < len2) res.push(arr2[i2++].key);
    // Return sorted array.
    return res;
}

export class PkImpl<TVertex> implements Algo<TVertex, PkVertexData> {
    private id: number;

    constructor(private setConstructor: SetConstructor, private arrayFrom: ArrayFrom) {
        this.id = 0;
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
        const delta_xy_b: Set<TVertex> = new this.setConstructor();
        const delta_xy_f: Set<TVertex> = new this.setConstructor();
        if (lb < ub) {
            // Discovery
            if (!this.dfs_f(y, adapter, ub, delta_xy_f)) return false;
            this.dfs_b(x, adapter, lb, delta_xy_b);
            // Reassignment
            this.reorder(delta_xy_f, delta_xy_b, adapter);
        }
        return true;
    }

    private dfs_f(first: TVertex, adapter: GraphAdapter<TVertex, PkVertexData>, ub: number, delta_xy_f: Set<TVertex>): boolean {
        const stack = [first];
        while (stack.length > 0) {
            const n = stack.pop() as TVertex;
            adapter.getData(n).visited = true;
            delta_xy_f.add(n);
            for (let it = adapter.getSuccessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                const w_data = adapter.getData(res.value);
                if (w_data.order === ub) {
                    // cycle
                    return false;
                }
                // is w unvisited and in affected region?
                if (!w_data.visited && w_data.order < ub) {
                    stack.push(res.value);
                }
            };
        }
        return true;
    }

    private dfs_b(first: TVertex, adapter: GraphAdapter<TVertex, PkVertexData>, lb: number, delta_xy_b: Set<TVertex>): void {
        const stack = [first];
        while (stack.length > 0) {
            const n = stack.pop() as TVertex;
            adapter.getData(n).visited = true;
            delta_xy_b.add(n);
            for (let it = adapter.getPredecessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                // is w unvisited and in affected region?
                const w_data = adapter.getData(res.value);
                if (!w_data.visited && lb < w_data.order) {
                    stack.push(res.value);
                }
            };
        }
    }

    private sort(adapter: GraphAdapter<TVertex, PkVertexData>, set: Set<TVertex>): KeyValueEntry<any, TVertex>[] {
        // Sort by topological order.
        return this.arrayFrom(set, vertex => ({
            key: adapter.getData(vertex).order,
            value: vertex,
        })).sort((v1, v2) => v1.key - v2.key);
    }

    private load(adapter: GraphAdapter<TVertex, PkVertexData>, array: KeyValueEntry<number, TVertex>[], L: TVertex[]): void {
        for (let i = 0, j = array.length; i < j; ++i) {
            const w = array[i].value;
            const w_data = adapter.getData(w);
            // abuse the key property to store new data
            array[i].key = w_data.order;
            w_data.visited = false;
            L.push(w);
        }
    }

    private reorder(delta_xy_f: Set<TVertex>, delta_xy_b: Set<TVertex>, adapter: GraphAdapter<TVertex, PkVertexData>) {
        // sort sets to preserve original order of elements
        const array_delta_xy_f = this.sort(adapter, delta_xy_f);
        const array_delta_xy_b = this.sort(adapter, delta_xy_b);

        const L: TVertex[] = [];
        // Load delta_xy_b onto array L first
        this.load(adapter, array_delta_xy_b, L);
        // Now load delta_xy_f onto array L
        this.load(adapter, array_delta_xy_f, L);

        const R: number[] = tkMerge(array_delta_xy_b, array_delta_xy_f);

        // allocate vertices in L starting from lowest
        for (let i = 0, j = L.length; i < j; ++i) {
            adapter.getData(L[i]).order = R[i];
        }
    }
}