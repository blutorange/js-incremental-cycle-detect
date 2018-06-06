import { Pair, Predicate, RemoveFrom, Triple, TypedFunction } from "andross";
import { Graph } from "graphlib";
import { CommonAdapter, CustomVertexData, CycleDetector, GenericGraphAdapterOptions, GraphAdapter, GraphlibAdapterOptions, VertexData } from "./Header";
import { PartialExcept } from "./InternalHeader";
import { PearceKellyDetector } from "./PearceKellyDetector";

const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
function assign<TFirst, TSecond>(target: TFirst, source: TSecond): TFirst & TSecond {
    for (const key in source) {
        if (hasOwnProperty.call(source, key)) {
            (target as any)[key] = source[key] as any;
        }
    }
    return target as any;
}

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

function createFilteredIterator<T>(it: Iterator<T>, filter: Predicate<T>): Iterator<T> {
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

function contractEdge<TVertex, TEdgeData>(adapter: CommonAdapter<TVertex, TEdgeData>, from: TVertex, to: TVertex, newVertex?: TVertex): boolean {
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

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency and
 * pass a reference to the graphlib Graph constructor to the constructor of this class.
 *
 * @see {@link CommonAdapter}
 */
export class GraphlibAdapter<TVertexData extends VertexData = any, TEdgeData = any> implements CommonAdapter<string, TEdgeData> {
    private g: Graph;
    private detector: CycleDetector<string>;
    private adapter: GraphAdapter<string>;

    constructor(options: PartialExcept<GraphlibAdapterOptions<string>, "graphlib">) {
        this.g = new options.graphlib(assign({directed: true}, options.graphOptions));
        this.detector = options.cycleDetector || new PearceKellyDetector();
        this.adapter = {
            getData: this.getData.bind(this),
            getPredecessorsOf: this.getPredecessorsOf.bind(this),
            getSuccessorsOf: this.getSuccessorsOf.bind(this),
        };
    }

    contractEdge(from: string, to: string, newVertex?: string): boolean {
        return contractEdge(this, from, to, newVertex);
    }

    isReachable(source: string, target: string): boolean {
        return this.detector.isReachable(this.adapter, source, target);
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

    getVertexData(vertex: string): RemoveFrom<TVertexData, VertexData> {
        return this.g.node(vertex);
    }

    getEdgeData(from: string, to: string): TEdgeData {
        return this.g.edge(from, to);
    }

    setEdgeData(from: string, to: string, data: TEdgeData): boolean {
        if (!this.g.hasEdge(from, to)) {
            return false;
        }
        this.g.setEdge(from, to, data);
        return true;
    }

    getVertices(): Iterator<string> {
        return createArrayIterator(this.g.nodes());
    }

    getEdges(): Iterator<Pair<string>> {
        return createMappedArrayIterator(this.g.edges(), edge => [edge.v, edge.w] as Pair<string>);
    }

    supportsOrder(): boolean {
        return this.detector.supportsOrder();
    }

    getOrder(vertex: string): number {
        return this.detector.getOrder(this.adapter, vertex);
    }

    /**
     * Allows access to the graphlib graph. May be used for some algorithms
     * Do not use this to modify the graph, or the cycle detection may not
     * work anymore.
     */
    get graph() {
        return this.g;
    }

    addEdge(from: string, to: string, label?: TEdgeData, name?: string): boolean {
        // Check if edge exists already, if so, do nothing
        if (this.g.hasEdge(from, to, name)) {
            return false;
        }
        // Check if vertices exist, if not, add them
        const didNotHaveFrom = this.addVertex(from);
        const didNotHaveTo = this.addVertex(to);
        if (!this.detector.canAddEdge(this.adapter, from, to)) {
            // remove vertices if we added it
            // this method must not modify the graph if edge cannot be added
            if (didNotHaveFrom) {
                this.deleteVertex(from);
            }
            if (didNotHaveTo) {
                this.deleteVertex(to);
            }
            return false;
        }
        // Add the edge
        this.g.setEdge(from, to, label, name);
        return true;
    }

    addVertex(vertex: string, label?: CustomVertexData<TVertexData>): boolean {
        if (this.hasVertex(vertex)) {
            return false;
        }
        const vertexData = this.detector.createVertexData(this.adapter, vertex);
        this.g.setNode(vertex, label !== undefined ? assign(vertexData, label) : vertexData);
        return true;
    }

    deleteEdge(from: string, to: string, name?: string): boolean {
        if (!this.g.hasEdge(from, to, name)) {
            return false;
        }
        this.g.removeEdge(from, to);
        return true;
    }

    deleteVertex(vertex: string): boolean {
        if (!this.g.hasNode(vertex)) {
            return false;
        }
        this.detector.onVertexDeletion(this.adapter, vertex);
        this.g.removeNode(vertex);
        return true;
    }

    private getData(key: string): VertexData {
        return this.g.node(key) as VertexData;
    }
}

/**
 * Generic graph data structure that supports all types of vertex objects by using
 * `Map`s. Allows you to associate arbitrary data with each edge. For vertex data,
 * use an appropriate `TVertex` type.
 *
 * ```typescript
 *
 * // Type of the data we want to use as vertices.
 * interface Vertex {
 *   id: number;
 *   name: string;
 *   // ...
 * }
 *
 * // Create a new graph.
 * const graph = new GenericGraphAdapter<Vertex, string>();
 *
 * // Add some vertices and edges.
 * const v1 = {id: 1, name: "foo"};
 * const v2 = {id: 2, name: "bar"};
 * const v3 = {id: 2, name: "bar"};
 *
 * graph.addVertex(v1);
 * graph.addVertex(v2);
 * graph.addVertex(v3);
 *
 * graph.addEdge(v1, v2, "This is edge 1-2.");
 * graph.addEdge(v2, v3, "This is edge 2-3.");
 *
 * // Fetch the data associated with the edge.
 * graph.getEdgeData(v1, v2); // => "This is edge 1-2."
 *
 * // This edge would create cycle.
 * graph.addEdge(v3, v1) // => false
 * graph.hasEdge(v3, v1) // => false
 * ```
 *
 * @see {@link CommonAdapter}
 */
export class GenericGraphAdapter<TVertex = any, TEdgeData = any> implements CommonAdapter<TVertex, TEdgeData | undefined> {
    private detector: CycleDetector<TVertex>;
    private adapter: GraphAdapter<TVertex>;
    private vertices: Map<TVertex, VertexData>;
    private forward: Map<TVertex, Map<TVertex, TEdgeData | undefined>>;
    private backward: Map<TVertex, Map<TVertex, boolean>>;
    private edgeCount: number;
    private mapConstructor: MapConstructor;

    constructor(options: Partial<GenericGraphAdapterOptions<TVertex>> = {}) {
        const mapConstructor = options.mapConstructor || Map;
        this.detector = options.cycleDetector || new PearceKellyDetector();
        this.forward = new mapConstructor();
        this.backward = new mapConstructor();
        this.mapConstructor = mapConstructor;
        this.vertices = new mapConstructor();
        this.edgeCount = 0;
        // expose private getData method to the algorithm
        this.adapter = {
            getData: this.getData.bind(this),
            getPredecessorsOf: this.getPredecessorsOf.bind(this),
            getSuccessorsOf: this.getSuccessorsOf.bind(this),
        };
    }

    contractEdge(from: TVertex, to: TVertex, newVertex?: TVertex): boolean {
        return contractEdge(this, from, to, newVertex);
    }

    isReachable(source: TVertex, target: TVertex): boolean {
        return this.detector.isReachable(this.adapter, source, target);
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        const f = this.forward.get(vertex);
        if (f === undefined) {
            return EmptyIterator;
        }
        return f.keys();
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        const b = this.backward.get(vertex);
        if (b === undefined) {
            return EmptyIterator;
        }
        return b.keys();
    }

    getVertices(): Iterator<TVertex> {
        return this.vertices.keys();
    }

    getEdgeData(from: TVertex, to: TVertex): TEdgeData | undefined {
        const map = this.forward.get(from);
        if (!map) {
            return undefined;
        }
        return map.get(to);
    }

    setEdgeData(from: TVertex, to: TVertex, data: TEdgeData | undefined): boolean {
        const map = this.forward.get(to);
        if (!map || !map.has(from)) {
            return false;
        }
        map.set(from, data);
        return true;
    }

    getEdges(): Iterator<Pair<TVertex>> {
        const edges: Pair<TVertex>[] = [];
        for (let it = this.forward.entries(), res = it.next(); !res.done; res = it.next()) {
            for (let it2 = res.value[1].keys(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                edges.push([res.value[0], res2.value]);
            }
        }
        return createArrayIterator(edges);
    }

    getEdgeCount(): number {
        return this.edgeCount;
    }

    supportsOrder(): boolean {
        return this.detector.supportsOrder();
    }

    getOrder(vertex: TVertex): number {
        return this.detector.getOrder(this.adapter, vertex);
    }

    getVertexCount(): number {
        return this.vertices.size;
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        return f ? f.has(to) : false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices.has(vertex);
    }

    addEdge(from: TVertex, to: TVertex, edgeData?: TEdgeData): boolean {
        // check if vertices exists, if not add it
        let f = this.forward.get(from);
        let b = this.backward.get(to);
        const didNotHaveFrom = this.addVertex(from);
        const didNotHaveTo = this.addVertex(to);
        if (!f) {
            this.forward.set(from, f = new this.mapConstructor());
        }
        if (!b) {
            this.backward.set(to, b = new this.mapConstructor());
        }

        // check if this edge creates a cycle
        if (!this.detector.canAddEdge(this.adapter, from, to)) {
            // remove vertices if we added it
            // this method must not modify the graph if edge cannot be added
            if (didNotHaveFrom) {
                this.deleteVertex(from);
            }
            if (didNotHaveTo) {
                this.deleteVertex(to);
            }
            return false;
        }

        // check if the edge exists, if not, add it
        const sizeBefore = f.size;
        f.set(to, edgeData);
        b.set(from, true);
        if (sizeBefore === f.size) {
            // edge exists already
            return false;
        }
        this.edgeCount += 1;
        return true;
    }

    addVertex(vertex: TVertex): boolean {
        if (this.vertices.has(vertex)) {
            return false;
        }
        this.vertices.set(vertex, this.detector.createVertexData(this.adapter, vertex));
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
        if (!this.vertices.has(vertex)) {
            // vertex does not exist
            return false;
        }
        this.detector.onVertexDeletion(this.adapter, vertex);
        // delete all inbound/outbound edges
        for (let it = this.getSuccessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(vertex, res.value);
        }
        for (let it = this.getPredecessorsOf(vertex), res = it.next(); !res.done; res = it.next()) {
            this.deleteEdge(res.value, vertex);
        }
        this.vertices.delete(vertex);
        return true;
    }

    toJSON() {
        return {
            edges: toArray(this.getEdges()),
            vertices: toArray(this.getVertices()),
        };
    }

    private getData(key: TVertex): VertexData {
        return this.vertices.get(key) as VertexData;
    }
}

type MultiGraphTargetData<TEdgeData, TEdgeLabel> = Map<TEdgeLabel | undefined, TEdgeData | undefined>;

/**
 * Generic graph data structure similar to {@link GenericGraphAdapter}. It additionally
 * supports multiple edges between two vertices. An edge is identified by its label.
 *
 * ```typescript
 *
 * // Type of the data we want to use as vertices.
 * interface Vertex {
 *   id: number;
 *   name: string;
 *   // ...
 * }
 *
 * // Create a new graph.
 * const graph = new MultiGraphAdapter<Vertex, string>();
 *
 * // Add some vertices and edges.
 * const v1 = {id: 1, name: "foo"};
 * const v2 = {id: 2, name: "bar"};
 * const v3 = {id: 2, name: "baz"};
 *
 * graph.addVertex(v1);
 * graph.addVertex(v2);
 * graph.addVertex(v3);
 *
 * graph.addEdge(v1, v2, "Some edge data", "Label1");
 * // Another edge from v1 to v2, but with a different label.
 * graph.addEdge(v1, v2, "More edge data", "Label2");
 * graph.addEdge(v2, v3, "Even more data, "Label3");
 *
 * // Fetch the data associated with the edge.
 * graph.getEdgeData(v1, v2, "Label1"); // => "Some edge data"
 * graph.getEdgeData(v1, v2, "Label2"); // => "More edge data"
 * graph.getEdgeData(v1, v2, "no-such-label"); // => undefined
 *
 * // This edge would create cycle.
 * graph.addEdge(v3, v1); // => false
 * graph.hasEdge(v3, v1); // => false
 *
 * graph.deleteEdge(v1, v2, "Label2");
 * // There is still an edge left between v1 and v2, so this would create a cycle.
 * graph.addEdge(v3, v1) // => false;
 *
 * graph.deleteEdge(v1, v2, "Label1");
 * graph.addEdge(v3, v1) // true;
 * ```
 *
 * @see {@link GenericGraphAdapter}
 * @see {@link CommonAdapter}
 */
export class MultiGraphAdapter<TVertex = any, TEdgeData = any, TEdgeLabel = any> implements CommonAdapter<TVertex, TEdgeData | undefined> {
    private g: GenericGraphAdapter<TVertex, MultiGraphTargetData<TEdgeData, TEdgeLabel>>;
    private edgeCount: number;

    constructor(options: Partial<GenericGraphAdapterOptions<TVertex>> = {}) {
        this.g = new GenericGraphAdapter(options);
        this.edgeCount = 0;
    }

    /**
     * If no label is given, defaults to `undefined` for the label.
     * @see {@link CommonAdapter}#addEdge
     */
    addEdge(from: TVertex, to: TVertex, data?: TEdgeData, label?: TEdgeLabel): boolean {
        const srcData = this.g.getEdgeData(from, to);
        if (srcData !== undefined) {
            // Second or more edge between these vertices.
            const sizeBefore = srcData.size;
            srcData.set(label, data);
            if (sizeBefore === srcData.size) {
                return false;
            }
            this.edgeCount += 1;
            return true;
        }
        // First edge between these vertices.
        this.edgeCount += 1;
        const newData: MultiGraphTargetData<TEdgeData, TEdgeLabel> = new Map();
        newData.set(label, data);
        return this.g.addEdge(from, to, newData);
    }

    addVertex(vertex: TVertex): boolean {
        return this.g.addVertex(vertex);
    }

    /**
     * This contracts two vertices, ie. all edges between the given vertices.
     * See {@link CommonAdapter}#contractEdge.
     */
    contractEdge(from: TVertex, to: TVertex, newVertex?: TVertex): boolean {
        return this.g.contractEdge(from, to, newVertex);
    }

    /**
     * If no label is given, deletes all edges between the two given vertices.
     * @see {@link CommonAdapter}#deleteEdge
     */
    deleteEdge(from: TVertex, to: TVertex, label?: TEdgeLabel): boolean {
        if (label === undefined) {
            this.edgeCount -= this.getEdgeCountBetween(from, to);
            return this.g.deleteEdge(from, to);
        }
        const srcData = this.g.getEdgeData(from, to);
        if (srcData === undefined) {
            // No such edge.
            return false;
        }
        const wasDeleted = srcData.delete(label);
        if (wasDeleted) {
            this.edgeCount -= 1;
        }
        if (srcData.size === 0) {
            // No more edges between these vertices.
            this.g.deleteEdge(from, to);
        }
        return wasDeleted;
    }

    deleteVertex(vertex: TVertex): boolean {
        return this.g.deleteVertex(vertex);
    }

    /**
     * @return The number of edges between two distinct vertices, ie. not including
     * multiple edges between the same vertices.
     */
    getUniqueEdgeCount(): number {
        return this.g.getEdgeCount();
    }

    /**
     * This returns the number of all edges, ie. including multiple
     * edges between the same vertices.
     * @see {@link CommonAdapter}#getEdgeCount
     */
    getEdgeCount(): number {
        return this.edgeCount;
    }

    /**
     * If no label is given, defaults to `undefined` for the label.
     * @see {@link CommonAdapter}#getEdgeData
     */
    getEdgeData(from: TVertex, to: TVertex, label?: TEdgeLabel): TEdgeData | undefined {
        const data = this.g.getEdgeData(from, to);
        if (data === undefined) {
            return undefined;
        }
        return data.get(label);
    }

    /**
     * If no label is given, defaults to `undefined` for the label.
     * @see {@link CommonAdapter}#setEdgeData
     */
    setEdgeData(from: TVertex, to: TVertex, data: TEdgeData | undefined, label?: TEdgeLabel): boolean {
        const d = this.g.getEdgeData(from, to);
        if (d === undefined || !d.has(label)) {
            return true;
        }
        d.set(label, data);
        return true;
    }

    getEdges(): Iterator<[TVertex, TVertex]> {
        return this.g.getEdges();
    }

    /**
     * @param from Source vertex.
     * @param to Target vertex.
     * @return How many edges there are between the two vertices.
     */
    getEdgeCountBetween(from: TVertex, to: TVertex): number {
        const data = this.g.getEdgeData(from, to);
        if (data === undefined) {
            return 0;
        }
        return data.size;
    }

    getEdgeLabels(from: TVertex, to: TVertex): Iterator<TEdgeLabel | undefined> {
        const data = this.g.getEdgeData(from, to);
        if (data === undefined) {
            return EmptyIterator;
        }
        return data.keys();
    }

    getLabeledEdges(): Iterator<[TVertex, TVertex, TEdgeLabel | undefined]> {
        const edges: Triple<TVertex, TVertex, TEdgeLabel | undefined>[] = [];
        for (let it = this.g.getEdges(), res = it.next(); !res.done; res = it.next()) {
            const from = res.value[0];
            const to = res.value[1];
            const data = this.g.getEdgeData(from, to);
            if (data !== undefined) {
                for (let it2 = data.keys(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                    edges.push([from, to, res2.value]);
                }
            }
        }
        return createArrayIterator(edges);
    }

    /**
     * If a label is given, only returns predecessors connected to this
     * vertex by an edge with the given label.
     * @see {@link CommonAdapter}#getPredecessorsOf
     */
    getPredecessorsOf(vertex: TVertex, label?: TEdgeLabel): Iterator<TVertex> {
        if (label === undefined) {
            return this.g.getPredecessorsOf(vertex);
        }
        return createFilteredIterator(this.g.getPredecessorsOf(vertex), to => {
            const data = this.g.getEdgeData(vertex, to);
            return data !== undefined && data.has(label);
        });
    }

    /**
     * If a label is given, only returns successors connected to this
     * vertex by an edge with the given label.
     * @see {@link CommonAdapter}#getSuccessorsOf
     */
    getSuccessorsOf(vertex: TVertex, label?: TEdgeLabel): Iterator<TVertex> {
        if (label === undefined) {
            return this.g.getSuccessorsOf(vertex);
        }
        return createFilteredIterator(this.g.getSuccessorsOf(vertex), to => {
            const data = this.g.getEdgeData(vertex, to);
            return data !== undefined && data.has(label);
        });
    }

    getOrder(vertex: TVertex): number {
        return this.g.getOrder(vertex);
    }

    supportsOrder(): boolean {
        return this.g.supportsOrder();
    }

    getVertexCount(): number {
        return this.g.getVertexCount();
    }

    getVertices(): Iterator<TVertex> {
        return this.g.getVertices();
    }

    /**
     * If no label is given, returns true iff an edge with any label exists
     * between the two given vertices. Otherwise, returns true iff an edge
     * with the given label exists.
     * @see {@link CommonAdapter}#hasEdge
     */
    hasEdge(from: TVertex, to: TVertex, label?: TEdgeLabel): boolean {
        const data = this.g.getEdgeData(from, to);
        // No label given and edge exsists, or edge with given label exists.
        return data !== undefined && (label === undefined || data.has(label));
    }

    hasVertex(vertex: TVertex): boolean {
        return this.g.hasVertex(vertex);
    }

    isReachable(source: TVertex, target: TVertex): boolean {
        return this.g.isReachable(source, target);
    }
}
