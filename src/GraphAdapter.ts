import { Pair, RemoveFrom, TypedFunction } from "andross";
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

function contractEdge<TVertex>(adapter: CommonAdapter<TVertex>, from: TVertex, to: TVertex): boolean {
    if (!adapter.hasEdge(from, to)) {
        return false;
    }

    adapter.deleteEdge(from, to);

    // If target is still reachable after removing the edge(s) between source
    // and target, merging both vertices results in a cycle.
    if (adapter.isReachable(from, to)) {
        adapter.addEdge(from, to);
        return false;
    }

    const succ = [];
    const pred = [];

    // Remove all edges from the second vertex.
    for (let it = adapter.getSuccessorsOf(to), res = it.next(); !res.done; res = it.next()) {
        adapter.deleteEdge(to, res.value);
        succ.push(res.value);
    }

    for (let it = adapter.getPredecessorsOf(to), res = it.next(); !res.done; res = it.next()) {
        adapter.deleteEdge(res.value, to);
        pred.push(res.value);
    }

    // Add all the removed edges to the first vertex.
    for (const node of succ) {
        adapter.addEdge(from, node);
    }
    for (const node of pred) {
        adapter.addEdge(node, from);
    }

    // Finally delete the second vertex. Now the edge is contracted.
    adapter.deleteVertex(to);

    return true;
}

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency and
 * pass a reference to the graphlib Graph constructor to the constructor of this class.
 *
 * @see {@link CommonAdapter}
 */
export class GraphlibAdapter<TVertexData extends VertexData= any, TEdgeData = any> implements CommonAdapter<string> {
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

    contractEdge(from: string, to: string): boolean {
        return contractEdge(this, from, to);
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

    getVertices(): Iterator<string> {
        return createArrayIterator(this.g.nodes());
    }

    getEdges(): Iterator<Pair<string>> {
        return createMappedArrayIterator(this.g.edges(), edge => [edge.v, edge.w] as Pair<string>);
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
 * `Map`s. Allows you to associate arbitrary data with each edges source and target,
 * ie. associates a pair `(TEdgeSourceData, TEdgeTargetData)` with each edge. Feel
 * free to use only `TEdgeSourceData` if you don't need a pair of data. For vertex
 * data, use an appropriate `TVertex` type.
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
 * graph.getEdgeSourceData(v1, v2); // => "This is edge 1-2."
 * graph.getEdgeTargetData(v1, v2); // => undefined
 *
 * // This edge would create cycle.
 * graph.addEdge(v3, v1) // => false
 * graph.hasEdge(v3, v1) // => false
 * ```
 *
 * @see {@link CommonAdapter}
 */
export class GenericGraphAdapter<TVertex = any, TEdgeSourceData = any, TEdgeTargetData = any> implements CommonAdapter<TVertex> {
    private detector: CycleDetector<TVertex>;
    private adapter: GraphAdapter<TVertex>;
    private vertices: Map<TVertex, VertexData>;
    private forward: Map<TVertex, Map<TVertex, TEdgeTargetData | undefined>>;
    private backward: Map<TVertex, Map<TVertex, TEdgeSourceData | undefined>>;
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

    contractEdge(from: TVertex, to: TVertex): boolean {
        return contractEdge(this, from, to);
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

    /**
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return The data associated with the source of the given edge, or `undefined` if no data is associated.
     */
    getEdgeSourceData(from: TVertex, to: TVertex): TEdgeSourceData | undefined {
        const map = this.backward.get(to);
        if (!map) {
            return undefined;
        }
        return map.get(from);
    }

    /**
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return The data associated with the target of the given edge, or `undefined` if no data is associated.
     */
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
            for (let it2 = res.value[1].keys(), res2 = it2.next(); !res2.done; res2 = it2.next()) {
                edges.push([res.value[0], res2.value]);
            }
        }
        return createArrayIterator(edges);
    }

    getEdgeCount(): number {
        return this.edgeCount;
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

    addEdge(from: TVertex, to: TVertex, edgeSourceData?: TEdgeSourceData, edgeTargetData?: TEdgeTargetData): boolean {
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

    private getData(key: TVertex): VertexData {
        return this.vertices.get(key) as VertexData;
    }
}
