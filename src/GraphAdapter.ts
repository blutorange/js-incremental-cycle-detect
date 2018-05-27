import { Omit, Pair, TypedFunction } from "andross";
import { Graph, GraphOptions } from "graphlib";
import { CycleDetectorImpl } from "./CycleDetector";
import { CycleDetector, ObjectVertex } from "./Header";
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

/**
 * Deletes all incoming and outgoing edges of the vertex.
 * @param adapter The graph data structure.
 * @param vertex The vertex whose in/out edges are to be deleted.
 */
function deleteInOut<TVertex>(adapter: CycleDetector<TVertex>, vertex: TVertex) {
    for (let it = adapter.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
        adapter.deleteEdge(vertex, res.value);
    }
    for (let it = adapter.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
        adapter.deleteEdge(res.value, vertex);
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

/**
 * A graph adapter for an adjacency data structure with vertices represented as objects.
 * See {@link CycleDetector}.
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
export class ObjectGraphAdapter<TData = any> extends CycleDetectorImpl<ObjectVertex, TData> {
    private setConstructor: SetConstructor;
    private vertices: Set<ObjectVertex>;
    private edgeCount: number;

    constructor(setConstructor?: SetConstructor) {
        super(new PearceKellyImpl());
        this.setConstructor = setConstructor || Set;
        this.vertices = new this.setConstructor();
        this.edgeCount = 0;
    }

    _getData(key: ObjectVertex): Readonly<VertexData<TData>> {
        return key.data as VertexData<TData>;
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

    getEdgeCount(): number {
        return this.edgeCount;
    }

    getVertexCount(): number {
        return this.vertices.size;
    }

    getVertices(): Iterator<ObjectVertex> {
        return this.vertices.values();
    }

    getEdges(): Iterator<Pair<ObjectVertex>> {
        const edges: Pair<ObjectVertex>[] = [];
        for (let it = this.getVertices(), res = it.next(); !res.done; res = it.next()) {
            for (let it2 = res.value.next.values(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                edges.push([res.value, res2.value]);
            }
        }
        return createArrayIterator(edges);
    }

    protected _deleteData(key: ObjectVertex): void {
        key.data = undefined;
    }

    protected _setData(key: ObjectVertex, data: VertexData): void {
        key.data = data;
    }

    protected _addEdge(from: ObjectVertex, to: ObjectVertex): void {
        this.edgeCount += 1;
        from.next.add(to);
        to.prev.add(from);
    }

    protected _addVertex(vertex: ObjectVertex): void {
        this.vertices.add(vertex);
    }

    protected _deleteEdge(from: ObjectVertex, to: ObjectVertex): void {
        this.edgeCount -= 1;
        from.next.delete(to);
        to.prev.delete(from);
    }

    protected _deleteVertex(vertex: ObjectVertex): void {
        deleteInOut(this, vertex);
        this.vertices.delete(vertex);
    }
}

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency to use this class.
 * See {@link CycleDetector}.
 */
export class GraphlibAdapter<TData = any> extends CycleDetectorImpl<string, TData> {
    private g: Graph;

    constructor(graphOptions: Partial<Omit<GraphOptions, "directed" | "multigraph">> = {}, mapConstructor?: MapConstructor) {
        super(new PearceKellyImpl());
        this.g = new Graph(Object.assign({directed: true}, graphOptions));
    }

    _getData(key: string): Readonly<VertexData<TData>> {
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

    getVertices(): Iterator<string> {
        return createArrayIterator(this.g.nodes());
    }

    getEdges(): Iterator<Pair<string>> {
        return createMappedArrayIterator(this.g.edges(), edge => [edge.v, edge.w] as Pair<string>);
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

    protected _addEdge(from: string, to: string): void {
        this.g.setEdge(from, to);
    }

    protected _addVertex(vertex: string): void {
        this.g.setNode(vertex, undefined);
    }

    protected _deleteEdge(from: string, to: string): void {
        this.g.removeEdge(from, to);
    }

    protected _deleteVertex(vertex: string): void {
        this.g.removeNode(vertex);
    }
}

/**
 * Generic graph data structure that supports all types of vertex objects by using
 * maps/sets.
 *
 * See {@link CycleDetector}.
 */
export class GenericGraphAdapter<TVertex, TData = any> extends CycleDetectorImpl<TVertex, TData> {
    private forward: Map<TVertex, Set<TVertex>>;
    private backward: Map<TVertex, Set<TVertex>>;
    private data: Map<TVertex, VertexData>;
    private edgeCount: number;
    private setConstructor: SetConstructor;

    constructor(setConstructor?: SetConstructor, mapConstructor?: MapConstructor) {
        super(new PearceKellyImpl());
        mapConstructor = mapConstructor || Map;
        this.forward = new mapConstructor();
        this.backward = new mapConstructor();
        this.setConstructor = setConstructor || Set;
        this.data = new mapConstructor();
        this.edgeCount = 0;
    }

    _getData(key: TVertex): Readonly<VertexData<TData>> {
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

    getVertices(): Iterator<TVertex> {
        return this.forward.keys();
    }

    getEdges(): Iterator<Pair<TVertex>> {
        const edges: Pair<TVertex>[] = [];
        for (let it = this.forward.entries(), res = it.next(); !res.done; res = it.next()) {
            for (let it2 = res.value[1].values(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                edges.push([res.value[0], res2.value]);
            }
        }
        return createArrayIterator(edges);
    }

    getEdgeCount(): number {
        return this.edgeCount;
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
        this.edgeCount += 1;
        (this.forward.get(from) as Set<TVertex>).add(to);
        (this.backward.get(to) as Set<TVertex>).add(from);
    }

    protected _addVertex(vertex: TVertex): void {
        this.forward.set(vertex, new this.setConstructor<TVertex>());
        this.backward.set(vertex, new this.setConstructor<TVertex>());
    }

    protected _deleteEdge(from: TVertex, to: TVertex): void {
        this.edgeCount -= 1;
        (this.forward.get(from) as Set<TVertex>).delete(to);
        (this.backward.get(to) as Set<TVertex>).delete(from);
    }

    protected _deleteVertex(vertex: TVertex): void {
        deleteInOut(this, vertex);
        this.forward.delete(vertex);
        this.backward.delete(vertex);
    }
}
