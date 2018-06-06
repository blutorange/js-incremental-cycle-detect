import { Pair } from 'andross';
import { CommonAdapter, CycleDetector, GenericGraphAdapterOptions, GraphAdapter, VertexData } from './Header';
import { PearceKellyDetector } from './PearceKellyDetector';
import { EmptyIterator, contractEdge, createArrayIterator } from './util';

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

    private getData(key: TVertex): VertexData {
        return this.vertices.get(key) as VertexData;
    }
}
