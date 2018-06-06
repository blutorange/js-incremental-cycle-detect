import { Pair, Predicate, TypedFunction } from 'andross';
import { CommonAdapter } from './Header';

/**
 * @internal
 * @private
 */
export const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

/**
 * @internal
 * @private
 */
export const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
};

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @internal
 * @private
 */
export function assign<TFirst, TSecond>(target: TFirst, source: TSecond): TFirst & TSecond {
    for (const key in source) {
        if (hasOwnProperty.call(source, key)) {
            (target as any)[key] = source[key] as any;
        }
    }
    return target as any;
}

/**
 * @internal
 * @private
 */
export function toArray<T>(it: Iterator<T>) {
    const arr: T[] = [];
    for (let res = it.next(); !res.done; res = it.next()) {
        arr.push(res.value);
    }
    return arr;
}

/*
function createMappedIterator<T, V>(it: Iterator<T>, mapper: TypedFunction<T, V>): Iterator<V> {
    return {
        next(): IteratorResult<V> {
            const res = it.next();
            if (res.done) {
                return DoneIteratorResult;
            }
            return {
                done: false,
                value: mapper(res.value),
            };
        }
    };
}
*/

/**
 * @internal
 * @private
 */
export function createFilteredIterator<T>(it: Iterator<T>, filter: Predicate<T>): Iterator<T> {
    return {
        next(): IteratorResult<T> {
            let res = it.next();
            while (!res.done && !filter(res.value)) {
                res = it.next();
            }
            return res;
        }
    };
}

/**
 * @internal
 * @private
 */
export function createArrayIterator<T>(arr: (T|undefined)[]): Iterator<T> {
    let i = 0;
    return {
        next(): IteratorResult<T> {
            while (arr[i] === undefined) {
                if (i > arr.length) {
                    return DoneIteratorResult;
                }
                i +=  1;
            }
            return {
                done: false,
                value: arr[i++] as T,
            };
        }
    };
}

/**
 * @internal
 * @private
 */
export function createMappedArrayIterator<T, V>(arr: (T|undefined)[], mapFn: TypedFunction<T, V>): Iterator<V> {
    let i = 0;
    return {
        next(): IteratorResult<V> {
            while (arr[i] === undefined) {
                if (i > arr.length) {
                    return DoneIteratorResult;
                }
                i +=  1;
            }
            return {
                done: false,
                value: mapFn(arr[i++] as T),
            };
        }
    };
}

/**
 * @internal
 * @private
 */
export function contractEdge<TVertex, TEdgeData>(adapter: CommonAdapter<TVertex, TEdgeData>, from: TVertex, to: TVertex, newVertex?: TVertex): boolean {
    if (!adapter.hasEdge(from, to)) {
        return false;
    }

    {
        const data = adapter.getEdgeData(from, to);
        adapter.deleteEdge(from, to);

        // If target is still reachable after removing the edge(s) between source
        // and target, merging both vertices results in a cycle.
        if (adapter.isReachable(from, to)) {
            adapter.addEdge(from, to, data);
            return false;
        }
    }

    const succ: Pair<TVertex, TEdgeData>[] = [];
    const pred: Pair<TVertex, TEdgeData>[] = [];
    const useNew = newVertex !== undefined && newVertex !== from;

    // Remove all edges from the second vertex.
    for (let it = adapter.getSuccessorsOf(to), res = it.next(); !res.done; res = it.next()) {
        const data = adapter.getEdgeData(to, res.value);
        adapter.deleteEdge(to, res.value);
        succ.push([res.value, data]);
    }

    for (let it = adapter.getPredecessorsOf(to), res = it.next(); !res.done; res = it.next()) {
        const data = adapter.getEdgeData(res.value, to);
        adapter.deleteEdge(res.value, to);
        pred.push([res.value, data]);
    }

    if (useNew) {
        // Remove all edges from the first vertex.
        for (let it = adapter.getSuccessorsOf(from), res = it.next(); !res.done; res = it.next()) {
            const data = adapter.getEdgeData(from, res.value);
            adapter.deleteEdge(from, res.value);
            succ.push([res.value, data]);
        }
        for (let it = adapter.getPredecessorsOf(from), res = it.next(); !res.done; res = it.next()) {
            const data = adapter.getEdgeData(res.value, from);
            adapter.deleteEdge(res.value, from);
            pred.push([res.value, data]);
        }
    }

    // Add all the removed edges to the first or the new vertex.
    const vertex = useNew ? newVertex as TVertex : from;
    for (const node of succ) {
        adapter.addEdge(vertex, node[0], node[1]);
    }
    for (const node of pred) {
        adapter.addEdge(node[0], vertex, node[1]);
    }

    // Finally delete the second and the first vertex. Now the edge is contracted.
    adapter.deleteVertex(to);
    if (useNew) {
        adapter.deleteVertex(from);
    }

    return true;
}
