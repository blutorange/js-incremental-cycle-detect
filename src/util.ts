import { BinaryOperator, Consumer, Maybe, Pair, Predicate, TypedFunction } from "andross";
import { CommonAdapter, CycleDetector, GraphAdapter, VertexData } from "./Header";

function filterUndefined<T>(value: Maybe<T>): boolean {
    return value !== undefined;
}

/**
 * @internal
 * @private
 */
export function takeFirst<T>(first: T, second: T): T {
    return first;
}

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

/**
 * @internal
 * @private
 */
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

export function forEach<T>(callback: Consumer<T>, ...iterators: Iterator<T>[]): void {
    for (let i = 0, j = iterators.length; i < j; ++i) {
        for (let it = iterators[i], next = it.next(); !next.done; next = it.next()) {
            callback(next.value);
        }
    }
}

export function combineIterators<T>(...iterators: Iterator<T>[]): Iterator<T> {
    let iteratorIndex = 0;
    return {
        next(): IteratorResult<T> {
            if (iteratorIndex >= iterators.length) {
                return DoneIteratorResult;
            }
            let res = iterators[iteratorIndex].next();
            if (res.done) {
                iteratorIndex += 1;
                if (iteratorIndex >= iterators.length) {
                    return DoneIteratorResult;
                }
                res = iterators[iteratorIndex].next();
            }
            if (res.done) {
                return DoneIteratorResult;
            }
            return {
                done: false,
                value: res.value,
            };
        }
    };
}

/**
 * @internal
 * @private
 */
export function createMappedIterator<T, V>(it: Iterator<T>, mapper: TypedFunction<T, V>): Iterator<V> {
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

/**
 * @internal
 * @private
 */
export function createFilteredIterator<T>(it: Iterator<Maybe<T>>): Iterator<T>;
export function createFilteredIterator<T>(it: Iterator<T>, filter: Predicate<T>): Iterator<T>;
export function createFilteredIterator<T>(it: Iterator<T>, filter: Predicate<T> = filterUndefined): Iterator<T> {
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
export function createChainedIterator<T>(...its: Iterator<T>[]): Iterator<T> {
    let i = -1;
    let currentIterator: Iterator<T> = EmptyIterator;
    return {
        next(): IteratorResult<T> {
            let currentNext = currentIterator.next();
            while (currentNext.done) {
                const it = its[++i];
                if (it === undefined) {
                    return DoneIteratorResult;
                }
                currentIterator = it;
                currentNext = currentIterator.next();
            }
            return {
                done: false,
                value: currentNext.value,
            };
        }
    };
}

/**
 * Maps each item with the provided mapper function to an iterator, and iterates
 * over all items of these iterators.
 * @param iterator Base iterator.
 * @param mapper Mapper that maps an item to an iterator.
 * @internal
 * @private
 */
export function createFlatMappedIterator<T, S>(iterator: Iterator<T>, mapper: TypedFunction<T, Iterator<S>>): Iterator<S> {
    // The mapped sub iterator, initialize to an empty iterator. Once the
    // next method is called, we proceed to call iterator.next.
    let subIterator: Iterator<S> = EmptyIterator;
    return {
        next(): IteratorResult<S> {
            let subNext = subIterator.next();
            while (subNext.done) {
                const next = iterator.next();
                if (next.done) {
                    return DoneIteratorResult;
                }
                subIterator = mapper(next.value);
                subNext = subIterator.next();
            }
            return {
                done: false,
                value: subNext.value,
            };
        }
    };
}

/**
 * @internal
 * @private
 */
export function createArrayIterator<T>(array: (T|undefined)[]): Iterator<T> & {array: (T|undefined)[]} {
    let i = 0;
    return {
        array,
        next(): IteratorResult<T> {
            while (array[i] === undefined) {
                if (i > array.length) {
                    return DoneIteratorResult;
                }
                i +=  1;
            }
            return {
                done: false,
                value: array[i++] as T,
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
export function canContractEdge<TVertex, TEdgeData>(adapter: CommonAdapter<TVertex, TEdgeData>, from: TVertex, to: TVertex): boolean {
    // Cannot contract edge that does not exist.
    if (!adapter.hasEdge(from, to)) {
        return false;
    }

    // Contracting an edge creates a cycle iff there is another
    // path from the source vertex to the target vertex.
    const data = adapter.getEdgeData(from, to);
    adapter.deleteEdge(from, to);

    // If target is still reachable after removing the edge(s) between source
    // and target, merging both vertices results in a cycle.
    const result = !adapter.isReachable(from, to);

    // Make sure we do not modify the graph yet.
    adapter.addEdge(from, to, data);
    return result;
}

/**
 * @internal
 * @private
 */
export function contractEdge<TVertex, TEdgeData>(
    adapter: CommonAdapter<TVertex, TEdgeData>,
    from: TVertex, to: TVertex,
    vertexMerger: BinaryOperator<TVertex> = takeFirst,
    edgeMerger?: BinaryOperator<TEdgeData>
): boolean {
    // Cannot contract edge that does not exist.
    if (!adapter.hasEdge(from, to)) {
        return false;
    }

    // Contracting an edge creates a cycle iff there is another
    // path from the source vertex to the target vertex.
    const data = adapter.getEdgeData(from, to);
    adapter.deleteEdge(from, to);

    // If target is still reachable after removing the edge(s) between source
    // and target, merging both vertices results in a cycle.
    if (adapter.isReachable(from, to)) {
        adapter.addEdge(from, to, data);
        return false;
    }

    // Compute the new vertex that is to be used as a replacement.
    const newVertex = vertexMerger(from, to);

    // Cannot use another existing vertex.
    if (newVertex !== from && newVertex !== to && adapter.hasVertex(newVertex)) {
        adapter.addEdge(from, to, data);
        throw new Error("Cannot use existing vertex for edge contraction: " + newVertex);
    }

    performEdgeContraction(adapter, from, to, edgeMerger, newVertex);
    return true;
}

/**
 * @internal
 * @private
 */
function performEdgeContraction<TVertex, TEdgeData>(
        adapter: CommonAdapter<TVertex, TEdgeData>,
        from: TVertex,
        to: TVertex,
        dataMerger: BinaryOperator<TEdgeData> = takeFirst,
        newVertex: TVertex,
    ): void {
    const succ: Pair<TVertex, Maybe<TEdgeData>>[] = [];
    const pred: Pair<TVertex, Maybe<TEdgeData>>[] = [];

    // Remove all edges from the first vertex.
    if (newVertex !== from) {
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

    // Remove all edges from the second vertex.
    if (newVertex !== to) {
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
    }

    // Add new vertex if it does not exist.
    if (newVertex !== from && newVertex !== to) {
        adapter.addVertex(newVertex);
    }

    // Add all the removed edges to the new vertex.
    for (const node of succ) {
        // Merge data if the edge exists already
        const data = adapter.getEdgeData(newVertex, node[0]);
        if (data === undefined) {
            adapter.addEdge(newVertex, node[0], node[1]);
        }
        else {
            const other = node[1];
            adapter.setEdgeData(newVertex, node[0], other !== undefined ? dataMerger(data, other) : data);
        }
    }
    for (const node of pred) {
        // Merge data if the edge exists already
        const data = adapter.getEdgeData(node[0], newVertex);
        if (data === undefined) {
            adapter.addEdge(node[0], newVertex, node[1]);
        }
        else {
            const other = node[1];
            adapter.setEdgeData(node[0], newVertex, other !== undefined ? dataMerger(data, other) : data);
        }
    }

    // Finally delete the old vertices.
    if (newVertex !== to) {
        adapter.deleteVertex(to);
    }
    if (newVertex !== from) {
        adapter.deleteVertex(from);
    }

    //  Now the edge is contracted.
}

const DummyVertexData = {order: 0, visited: false};

/**
 * @private
 * @internal
 */
export const DummyDetector = new class implements CycleDetector<any> {
    map<TAnotherClonedVertex>(): CycleDetector<TAnotherClonedVertex> {
        return DummyDetector;
    }
    createVertexData(g: GraphAdapter<any>): VertexData {
        return DummyVertexData;
    }
    canAddEdge(g: GraphAdapter<any>, from: any, to: any): boolean {
        return true;
    }
    isReachable(g: GraphAdapter<any>, source: any, target: any): boolean {
        return false;
    }
    onVertexDeletion(g: GraphAdapter<any>, vertex: any): void {/***/}
    supportsOrder(): boolean {
        return false;
    }
    // and target, merging both vertices results in a cycle.
    getOrder(g: GraphAdapter<any>, vertex: any): number {
        return -1;
    }
}();
