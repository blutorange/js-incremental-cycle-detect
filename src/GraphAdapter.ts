import { Omit, Pair } from "andross";
import { Graph, GraphOptions } from "graphlib";
import { CycleDetectorImpl } from "./CycleDetector";
import { IdVertex, ObjectVertex } from "./Header";
import { VertexData } from "./InternalHeader";
import { PearceKellyImpl } from "./PearceKelly";

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

function createUndefinedArray(len: number): undefined[] {
    const arr = [];
    while (len -- > 0) {
        arr.push(undefined);
    }
    return arr;
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
export class IdGraphAdapter extends CycleDetectorImpl<IdVertex> {
    private vertices: (IdVertex|undefined)[];
    private id: number;

    constructor() {
        super(new PearceKellyImpl());
        this.vertices = [];
        this.id = 0;
    }

    getData(key: IdVertex): VertexData {
        return key.data as VertexData;
    }

    createVertex(): IdVertex {
        const base = {
            id: this.id++,
            next: createUndefinedArray(this.vertices.length),
            prev: createUndefinedArray(this.vertices.length),
        };
        return base;
    }

    getSuccessorsOf(vertex: IdVertex): Iterator<IdVertex> {
        return createArrayIterator(vertex.next);
    }

    getPredecessorsOf(vertex: IdVertex): Iterator<IdVertex> {
        return createArrayIterator(vertex.prev);
    }

    hasEdge(from: IdVertex, to: IdVertex): boolean {
        const f = this.vertices[from.id];
        if (f) {
            return f.next[to.id] !== undefined;
        }
        return false;
    }

    hasVertex(vertex: IdVertex): boolean {
        return this.vertices[vertex.id] !== undefined;
    }

    protected _deleteData(key: IdVertex): void {
        key.data = undefined;
    }

    protected _setData(key: IdVertex, data: VertexData): void {
        key.data = data;
    }

    protected _addEdge(from: IdVertex, to: IdVertex): void {
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

    protected _addVertex(vertex: IdVertex): void {
        ensureSize(this.vertices, vertex.id);
        this.vertices[vertex.id] = vertex;
    }

    protected _deleteEdge(from: IdVertex, to: IdVertex): boolean {
        const f = this.vertices[from.id];
        const b = this.vertices[to.id];
        if (f && b) {
            f.next[to.id] = undefined;
            b.prev[from.id] = undefined;
            return true;
        }
        return false;
    }

    protected _deleteVertex(vertex: IdVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.vertices[vertex.id] = undefined;
    }
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
export class ObjectGraphAdapter extends CycleDetectorImpl<ObjectVertex> {
    private setConstructor: SetConstructor;
    private vertices: Set<ObjectVertex>;

    constructor(setConstructor?: SetConstructor) {
        super(new PearceKellyImpl());
        this.setConstructor = setConstructor || Set;
        this.vertices = new this.setConstructor();
    }

    getData(key: ObjectVertex): VertexData {
        return key.data as VertexData;
    }

    createVertex(): ObjectVertex {
        const base = {
            next: new this.setConstructor<ObjectVertex>(),
            prev: new this.setConstructor<ObjectVertex>(),
        };
        return base;
    }

    getSuccessorsOf(vertex: ObjectVertex): Iterator<ObjectVertex> {
        return vertex.next.values();
    }

    getPredecessorsOf(vertex: ObjectVertex): Iterator<ObjectVertex> {
        return vertex.prev.values();
    }

    hasEdge(from: ObjectVertex, to: ObjectVertex): boolean {
        return from.next.has(to);
    }

    hasVertex(vertex: ObjectVertex): boolean {
        return this.vertices.has(vertex);
    }

    getVertexCount(): number {
        return this.vertices.size;
    }

    protected _deleteData(key: ObjectVertex): void {
        key.data = undefined;
    }

    protected _setData(key: ObjectVertex, data: VertexData): void {
        key.data = data;
    }

    protected _addEdge(from: ObjectVertex, to: ObjectVertex): void {
        from.next.add(to);
        to.prev.add(from);
    }

    protected _addVertex(vertex: ObjectVertex): void {
        this.vertices.add(vertex);
    }

    protected _deleteEdge(from: ObjectVertex, to: ObjectVertex): boolean {
        return from.next.delete(to) && to.prev.delete(from);
    }

    protected _deleteVertex(vertex: ObjectVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.vertices.delete(vertex);
    }
}

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency to use this class.
 */
export class GraphlibAdapter extends CycleDetectorImpl<string> {
    private g: Graph;

    constructor(graphOptions: Partial<Omit<GraphOptions, "directed" | "multigraph">> = {}, mapConstructor?: MapConstructor) {
        super(new PearceKellyImpl());
        this.g = new Graph(Object.assign({directed: true}, graphOptions));
    }

    getData(key: string): VertexData {
        return this.g.node(key) as VertexData;
    }

    getSuccessorsOf(vertex: string): Iterator<string> {
        const edges = this.g.successors(vertex);
        if (!edges) {
            return EmptyIterator;
        }
        return createArrayIterator(edges);
    }

    getPredecessorsOf(vertex: string): Iterator<string> {
        const edges = this.g.predecessors(vertex);
        if (!edges) {
            return EmptyIterator;
        }
        return createArrayIterator(edges);
    }

    hasEdge(from: string, to: string): boolean {
        return this.g.hasEdge(from, to);
    }

    hasVertex(vertex: string): boolean {
        return this.g.hasNode(vertex);
    }

    getVertexCount(): number {
        return this.g.nodeCount();
    }

    getEdgeCount(): number {
        return this.g.edgeCount();
    }

    /**
     * Allows access to the graphlib graph. Do not use this
     * to modify the graph, or the cycle detection may not work anymore.
     */
    get graph() {
        return this.g;
    }

    protected _deleteData(key: string): void {
        this.g.setNode(key, undefined);
    }

    protected _setData(key: string, data: VertexData): void {
        this.g.setNode(key, data);
    }

    protected _addEdge(from: string, to: string, id?: number): void {
        this.g.setEdge(from, to, undefined, id ? String(id) : undefined);
    }

    protected _addVertex(vertex: string): void {
        this.g.setNode(vertex, undefined);
    }

    protected _deleteEdge(from: string, to: string): boolean {
        if (!this.g.hasEdge(from, to)) {
            return false;
        }
        this.g.removeEdge(from, to);
        return true;
    }

    protected _deleteVertex(vertex: string): void {
        this.g.removeNode(vertex);
    }
}

/**
 * Generic graph data structure that supports all types of vertex objects.
 */
export class GenericGraphAdapter<TVertex> extends CycleDetectorImpl<TVertex> {
    private forward: Map<TVertex, Set<TVertex>>;
    private backward: Map<TVertex, Set<TVertex>>;
    private data: Map<TVertex, VertexData>;
    private setConstructor: SetConstructor;

    constructor(setConstructor?: SetConstructor, mapConstructor?: MapConstructor) {
        super(new PearceKellyImpl());
        this.forward = new (mapConstructor || Map)();
        this.backward = new (mapConstructor || Map)();
        this.setConstructor = setConstructor || Set;
        this.data = new (mapConstructor || Map)();
    }

    getData(key: TVertex): VertexData {
        return this.data.get(key) as VertexData;
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

    getVertexCount(): number {
        return this.forward.size;
    }

    protected _deleteData(key: TVertex): void {
        this.data.delete(key);
    }

    protected _setData(key: TVertex, data: VertexData): void {
        this.data.set(key, data);
    }

    protected _addEdge(from: TVertex, to: TVertex): void {
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

    protected _addVertex(vertex: TVertex): void {
        const f = this.forward.get(vertex);
        const b = this.backward.get(vertex);
        if (!f) {
            this.forward.set(vertex, new this.setConstructor<TVertex>());
        }
        if (!b) {
            this.backward.set(vertex, new this.setConstructor<TVertex>());
        }
    }

    protected _deleteEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        const b = this.backward.get(to);
        if (f && b) {
            f.delete(to);
            b.delete(from);
            return true;
        }
        return false;
    }

    protected _deleteVertex(vertex: TVertex): void {
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.forward.delete(vertex);
        this.backward.delete(vertex);
    }
}
