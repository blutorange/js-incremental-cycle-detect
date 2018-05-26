import { Omit, Pair, RemoveFrom, TypedFunction } from "andross";
import { Graph, GraphOptions } from "graphlib";
import { AssociatableGraph, GraphAdapter, ManipulableGraph } from "./Header";
import { VertexData } from "./InternalHeader";

const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
};

function ensureSize(arr: any[], minSize: number): void {
    if (minSize < arr.length) {
        return;
    }
    const newSize = Math.min(4, arr.length * 2);
    for (minSize = newSize - arr.length; minSize -- > 0;) {
        arr.push(undefined);
    }
}

function createArrayIterator<T>(arr: (T|undefined)[]): Iterator<T> {
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

function createMappedArrayIterator<T, V>(arr: (T|undefined)[], mapFn: TypedFunction<T, V>): Iterator<V> {
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

function createUndefinedArray(len: number): undefined[] {
    const arr = [];
    while (len -- > 0) {
        arr.push(undefined);
    }
    return arr;
}

export interface IdVertex<TVertex extends IdVertex<TVertex> = IdVertex<TVertex>> {
    /** Id of this vertex. */
    id: number;
    /** Set of immediate successors of this vertex. */
    next: (TVertex|undefined)[];
    /** Set of immediate predecessors of this vertex. */
    prev: (TVertex|undefined)[];
    data?: VertexData;
}

/**
 * Graph adapter for vertices with small integer ID used to store the vertices in arrays.
 *
 * ```
 * graph = [
 *   {
 *     id: 0,
 *     data: {} // custom data used by the algorithm
 *     next: [undefined, {id: 1, ...circular}, undefined],
 *     prev: [undefined, undefined, {id: 2, ...circular}]
 *   },
 *   {
 *      id: 1,
 *      data: {},
 *      next: [],
 *      prev: [{id: 0, ...circular}]
 *   },
 *   {
 *      id: 2,
 *      data: {},
 *      next: [],
 *      prev: [{id: 0, ...circular}]
 *   },
 *   ...
 * ]
 * ```
 */
export class IdGraphAdapter<TVertex extends IdVertex<TVertex>> implements ManipulableGraph<TVertex>, AssociatableGraph<TVertex> {
    private vertices: (TVertex|undefined)[];
    private id: number;

    constructor() {
        this.vertices = [];
        this.id = 0;
    }

    get multiEdgeSupported(): boolean {
        return false;
    }

    deleteData(key: TVertex): void {
        key.data = undefined;
    }

    getData(key: TVertex): VertexData {
        return key.data as VertexData;
    }

    setData(key: TVertex, data: VertexData): void {
        key.data = data;
    }

    createVertex(additionalData: RemoveFrom<TVertex, IdVertex<TVertex>>): TVertex {
        const base = {
            id: this.id++,
            next: createUndefinedArray(this.vertices.length),
            prev: createUndefinedArray(this.vertices.length),
        };
        return Object.assign(base, additionalData) as TVertex;
    }

    addEdge(from: TVertex, to: TVertex): void {
        const f = this.vertices[from.id];
        const b = this.vertices[to.id];
        if (f) {
            ensureSize(f.next, to.id);
            f.next[to.id] = to;
        }
        if (b) {
            ensureSize(b.prev, from.id);
            b.prev[from.id] = from;
        }
    }

    addVertex(vertex: TVertex): void {
        ensureSize(this.vertices, vertex.id);
        this.vertices[vertex.id] = vertex;
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        const f = this.vertices[from.id];
        const b = this.vertices[to.id];
        if (f) {
            f.next[to.id] = undefined;
        }
        if (b) {
            b.prev[from.id] = undefined;
        }

    }

    deleteVertex(vertex: TVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.vertices[vertex.id] = undefined;
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        return createArrayIterator(vertex.next);
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        return createArrayIterator(vertex.prev);
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.vertices[from.id];
        if (f) {
            return f.next[to.id] !== undefined;
        }
        return false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices[vertex.id] !== undefined;
    }
}

export interface ObjectVertex<TVertex extends ObjectVertex<TVertex>> {
    /** Set of immediate successors of this vertex. */
    next: Set<TVertex>;
    /** Set of immediate predecessors of this vertex. */
    prev: Set<TVertex>;
    /** Custom data for the algorithm. */
    data?: VertexData;
}

/**
 * A graph adapter for an adjacency data structure with vertices represented as objects:
 *
 * ```
 * graph = Set<
 *      {
 *          data: {} // custom data used by the algorithm
 *          next: Set // immediate successors
 *          prev: Set // immediate predeccesors
 *      }
 * >
 * ```
 */
export class ObjectGraphAdapter<TVertex extends ObjectVertex<TVertex> = ObjectVertex<TVertex>> implements GraphAdapter<TVertex> {
    private setConstructor: SetConstructor;
    private vertices: Set<TVertex>;

    constructor(setConstructor?: SetConstructor) {
        this.setConstructor = setConstructor || Set;
        this.vertices = new this.setConstructor();
    }

    get multiEdgeSupported(): boolean {
        return false;
    }

    deleteData(key: TVertex): void {
        key.data = undefined;
    }

    getData(key: TVertex): VertexData {
        return key.data as VertexData;
    }

    setData(key: TVertex, data: VertexData): void {
        key.data = data;
    }

    addEdge(from: TVertex, to: TVertex): void {
        from.next.add(to);
        to.prev.add(from);
    }

    createVertex(additionalData: RemoveFrom<TVertex, ObjectVertex<TVertex>>): TVertex {
        const base = {
            next: new this.setConstructor<TVertex>(),
            prev: new this.setConstructor<TVertex>(),
        };
        return Object.assign(base, additionalData) as TVertex;
    }

    addVertex(vertex: TVertex): void {
        this.vertices.add(vertex);
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        from.next.delete(to);
        to.prev.delete(from);
    }

    deleteVertex(vertex: TVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.vertices.delete(vertex);
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        return vertex.next.values();
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        return vertex.prev.values();
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        return from.next.has(to);
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices.has(vertex);
    }
}
/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency to use this class.
 */
export class GraphlibAdapter<TData extends VertexData = VertexData> implements GraphAdapter<string> {
    private g: Graph;

    constructor(graphOptions: Partial<Omit<GraphOptions, "directed">> = {}, mapConstructor?: MapConstructor) {
        this.g = new Graph(Object.assign({directed: true}, graphOptions));
    }

    get multiEdgeSupported(): boolean {
        return true;
    }

    deleteData(key: string): void {
        this.g.setNode(key, undefined);
    }

    getData(key: string): TData {
        return this.g.node(key) as TData;
    }

    setData(key: string, data: TData): void {
        this.g.setNode(key, data);
    }

    addEdge(from: string, to: string, id?: number): void {
        this.g.setEdge(from, to, undefined, id ? String(id) : undefined);
    }

    addVertex(vertex: string): void {
        this.g.setNode(vertex, undefined);
    }

    deleteEdge(from: string, to: string, id?: number): void {
        this.g.removeEdge(from, to, id ? String(id) : undefined);
    }

    deleteVertex(vertex: string): void {
        this.g.removeNode(vertex);
    }

    getSuccessorsOf(vertex: string): Iterator<string> {
        const edges = this.g.outEdges(vertex);
        if (!edges) {
            return EmptyIterator;
        }
        return createMappedArrayIterator(edges, edge => edge.w);
    }

    getPredecessorsOf(vertex: string): Iterator<string> {
        const edges = this.g.inEdges(vertex);
        if (!edges) {
            return EmptyIterator;
        }
        return createMappedArrayIterator(edges, edge => edge.w);
    }

    hasEdge(from: string, to: string, id?: number): boolean {
        return this.g.hasEdge(from, to, id ? String(id) : undefined);
    }

    hasVertex(vertex: string): boolean {
        return this.g.hasNode(vertex);
    }

    /**
     * Allows access to the graphlib graph. Do not use this
     * to modify the graph, or the cycle detection may not work anymore.
     */
    get graph() {
        return this.g;
    }
}

export class GenericGraphAdapter<TVertex> implements GraphAdapter<TVertex> {
    private forward: Map<TVertex, Set<TVertex>>;
    private backward: Map<TVertex, Set<TVertex>>;
    private map: Map<TVertex, VertexData>;
    private setConstructor: SetConstructor;

    constructor(setConstructor?: SetConstructor, mapConstructor?: MapConstructor) {
        this.forward = new (mapConstructor || Map)();
        this.backward = new (mapConstructor || Map)();
        this.setConstructor = setConstructor || Set;
        this.map = new (mapConstructor || Map)();
    }

    get multiEdgeSupported(): boolean {
        return false;
    }

    deleteData(key: TVertex): void {
        this.map.delete(key);
    }

    getData(key: TVertex): VertexData {
        return this.map.get(key) as VertexData;
    }

    setData(key: TVertex, data: VertexData): void {
        this.map.set(key, data);
    }

    addEdge(from: TVertex, to: TVertex): void {
        let f = this.forward.get(from);
        let b = this.backward.get(to);
        if (!f) {
            this.forward.set(from, f = new this.setConstructor<TVertex>());
        }
        if (!b) {
            this.backward.set(to, b = new this.setConstructor<TVertex>());
        }
        f.add(to);
        b.add(from);
    }

    addVertex(vertex: TVertex): void {
        const f = this.forward.get(vertex);
        const b = this.backward.get(vertex);
        if (!f) {
            this.forward.set(vertex, new this.setConstructor<TVertex>());
        }
        if (!b) {
            this.backward.set(vertex, new this.setConstructor<TVertex>());
        }
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        const f = this.forward.get(vertex);
        return f ? f.values() : EmptyIterator;
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        const b = this.backward.get(vertex);
        return b ? b.values() : EmptyIterator;
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        return f ? f.has(to) : false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.forward.get(vertex) !== undefined;
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        const f = this.forward.get(from);
        const b = this.backward.get(to);
        if (f) {
            f.delete(to);
        }
        if (b) {
            b.delete(from);
        }
    }

    deleteVertex(vertex: TVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.forward.delete(vertex);
        this.backward.delete(vertex);
    }

    /**
     * @return All vertices in this graph.
     */
    getVertices(): Iterator<TVertex> {
        return this.forward.keys();
    }

    /**
     * @return All edges of this graph. For performance, prefer `getVertices` and `getSuccessorsOf`.
     */
    getEdges(): Iterator<Pair<TVertex>> {
        const edges: Pair<TVertex>[] = [];
        for (let it = this.forward.entries(), res = it.next(); !res.done; res = it.next()) {
            for (let it2 = res.value[1].values(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                edges.push([res.value[0], res2.value]);
            }
        }
        return createArrayIterator(edges);
    }
}
