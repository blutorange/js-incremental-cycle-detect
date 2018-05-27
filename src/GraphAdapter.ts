import { Pair, PartialExcept, TypedFunction } from "andross";
import { Graph } from "graphlib";
import { CycleDetector, GenericGraphAdapterOptions, GraphAdapter, GraphlibAdapterOptions, ObjectVertex } from "./Header";
import { VertexData } from "./InternalHeader";
import { PearceKellyDetector, PearceKellyImpl } from "./PearceKelly";

const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
};


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
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency and
 * pass a reference to the graphlib Graph constructor to the constructor of this class.
 */
export class GraphlibAdapter<TData = any> {
    private g: Graph;

    constructor(options: PartialExcept<GraphlibAdapterOptions<string>, "graphlib">) {
        this.g = new options.graphlib(Object.assign({directed: true}, options.graphOptions));
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
 * `Map`s.
 */
export class GenericGraphAdapter<TVertex = any, TEdgeSourceData = any, TEdgeTargetData = any> {
    private detector: CycleDetector<TVertex>;
    private adapter: GraphAdapter<TVertex>;
    private forward: Map<TVertex, Map<TVertex, TEdgeTargetData | undefined>>;
    private backward: Map<TVertex, Map<TVertex, TEdgeSourceData | undefined>>;
    private data: Map<TVertex, VertexData>;
    private edgeCount: number;
    private mapConstructor: MapConstructor;

    constructor(options: Partial<GenericGraphAdapterOptions<TVertex>> = {}) {
        const mapConstructor = options.mapConstructor || Map;
        this.detector= options.cycleDetector || new PearceKellyDetector(); 
        this.forward = new mapConstructor();
        this.backward = new mapConstructor();
        this.data = new mapConstructor();
        this.mapConstructor = mapConstructor;
        this.edgeCount = 0;
        this.adapter = {
            getSuccessorsOf: this.getSuccessorsOf.bind(this),
            getPredecessorsOf: this.getPredecessorsOf.bind(this),
            getData: this.getData.bind(this),
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

    getVertices(): Iterator<TVertex> {
        return this.forward.keys();
    }

    getEdgeSourceData(from: TVertex, to: TVertex): TEdgeSourceData | undefined {
        const map = this.backward.get(from);
        if (!map) {
            return undefined;
        }
        return map.get(to);
    }

    getEdgeTargetData(from: TVertex, to: TVertex): TEdgeTargetData | undefined {
        const map = this.forward.get(from);
        if (!map) {
            return undefined;
        }
        return map.get(to);
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

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        return f ? f.has(to) : false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.forward.get(vertex) !== undefined;
    }

    addEdge(from: TVertex, to: TVertex, edgeSourceData?: TEdgeSourceData, edgeTargetData?: TEdgeTargetData): boolean {
        // check if this edge creates a cycle
        if (!this.detector.canAddEdge(this.adapter, from, to)) {
            return false;
        }
        // check if vertices exists, if not add it
        let f = this.forward.get(from);
        let b = this.backward.get(to);
        if (!f || !b) {
            this.setData(from, this.detector.createVertexData(this.adapter, from));
            this.forward.set(from, f = new this.mapConstructor());
            this.setData(to, this.detector.createVertexData(this.adapter, to));
            this.backward.set(to, b = new this.mapConstructor());
        }
        // check if the edge exists, if not, add it
        const sizeBefore = f.size;
        f.set(to, edgeTargetData);
        b.set(from, edgeSourceData);
        if (sizeBefore === f.size) {
            // edge exists already
            return false;
        }
        this.edgeCount += 1;
        return true;
    }

    addVertex(vertex: TVertex): boolean {
        if (this.hasVertex(vertex)) {
            return false;
        }
        this.setData(vertex, this.detector.createVertexData(this.adapter, vertex));
        this.forward.set(vertex, new this.mapConstructor<TVertex, TEdgeTargetData>());
        this.backward.set(vertex, new this.mapConstructor<TVertex, TEdgeSourceData>());
        return true;
    }

    deleteEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        const b = this.backward.get(to);
        if (!f || !b) {
            // vertices do not exist
            return false;
        }
        if (!f.delete(to) || !b.delete(from)) {
            // edge does not exist
            return false;
        }
        this.edgeCount -= 1;
        return true;
    }

    deleteVertex(vertex: TVertex): boolean {
        if (!this.deleteData(vertex)) {
            // vertex does not exist
            return false;
        }
        // delete all inbound/outbound edges
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.forward.delete(vertex);
        this.backward.delete(vertex);
        return true;
    }

    private getData(key: TVertex): VertexData {
        return this.data.get(key) as VertexData;
    }

    private setData(key: TVertex, data: VertexData): void {
        this.data.set(key, data);
    }

    private deleteData(key: TVertex): boolean {
        return this.data.delete(key);
    }
}
