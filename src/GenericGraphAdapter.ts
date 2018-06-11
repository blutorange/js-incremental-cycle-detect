import { BinaryOperator, Pair, TypedFunction, UnaryOperator } from "andross";
import { ClonableAdapter, CommonAdapter, CycleDetector, GenericGraphAdapterOptions, GraphAdapter, VertexData } from "./Header";
import { PearceKellyDetector } from "./PearceKellyDetector";
import { canContractEdge, contractEdge, createFilteredIterator, createFlatMappedIterator, createMappedIterator, DummyDetector, EmptyIterator } from "./util";

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
 * const graph = GenericGraphAdapter.create<Vertex, string>();
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
 * @typeparam TVertex Type of the vertices of this graph.
 * @typeparam TEdgeData Type of the data associated with edges.
 * @see {@link CommonAdapter}
 */
export class GenericGraphAdapter<TVertex = any, TEdgeData = any> implements CommonAdapter<TVertex, TEdgeData>, ClonableAdapter<TVertex, TEdgeData> {
    /**
     * Creates a new graph adapter with the given options.
     * @param options Options for configuring this instance.
     * @see {@link GenericGraphAdapterOptions}
     * @typeparam TVertex Type of the vertices of this graph.
     * @typeparam TEdgeData Type of the data associated with edges.
     */
    static create<TVertex = any, TEdgeData = any>(options: Partial<GenericGraphAdapterOptions<TVertex>> = {}): GenericGraphAdapter<TVertex, TEdgeData> {
        const mapConstructor = options.mapConstructor || Map;
        const detector = options.cycleDetector || new PearceKellyDetector();
        return new GenericGraphAdapter(mapConstructor, detector);
    }

    private detector: CycleDetector<TVertex>;
    private adapter: GraphAdapter<TVertex>;
    private vertices: Map<TVertex, VertexData>;
    private forward: Map<TVertex, Map<TVertex, TEdgeData | undefined>>;
    private backward: Map<TVertex, Map<TVertex, TEdgeData | undefined>>;
    private mapConstructor: MapConstructor;
    private edgeCount: number;

    private constructor(mapConstructor: MapConstructor, cycleDetector: CycleDetector<TVertex>) {
        this.detector = cycleDetector;
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

    map<TClonedVertex, TClonedEdgeData>(vertexMapper: TypedFunction<TVertex, TClonedVertex>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>): GenericGraphAdapter<TClonedVertex, TClonedEdgeData> {
        // Create a new clone with a dummy detector we are going to replace later.
        const clone = new GenericGraphAdapter<TClonedVertex, TClonedEdgeData>(this.mapConstructor, DummyDetector);
        // Make sure we only call vertexMapper once for each vertex.
        // Otherwise we might create new objects that do not compare
        // equal when used in Maps.
        const clonedVertexMap = new this.mapConstructor<TVertex, TClonedVertex>();
        // Set the new vertex data.
        this.vertices.forEach((vertexData, vertex) => {
            const clonedVertex = vertexMapper(vertex);
            clonedVertexMap.set(vertex, clonedVertex);
            clone.vertices.set(clonedVertex, vertexData);
        });
        // Iterate over the edges and set them on the clone. Also clone edge data.
        this.forward.forEach((map, from) => {
            const clonedMap = new this.mapConstructor<TClonedVertex, TClonedEdgeData | undefined>();
            const clonedFrom = clonedVertexMap.get(from) as TClonedVertex;
            map.forEach((edgeData, to) => {
                const clonedTo = clonedVertexMap.get(to) as TClonedVertex;
                const clonedEdgeData = edgeData !== undefined ? edgeDataMapper(edgeData) : undefined;
                clonedMap.set(clonedTo, clonedEdgeData);
                clone.addToBackwardsMap(clonedFrom, clonedTo, clonedEdgeData);
            });
            clone.forward.set(clonedFrom, clonedMap);
        });
        // Copy the edge count.
        clone.edgeCount = this.edgeCount;
        // Finally, we replace the dummy detector with a clone of the real detector.
        clone.detector = this.detector.map<TClonedVertex>(vertex => clonedVertexMap.get(vertex) as TClonedVertex);
        return clone;
    }

    clone(vertexCloner?: UnaryOperator<TVertex>, edgeDataCloner?: UnaryOperator<TEdgeData>): GenericGraphAdapter<TVertex, TEdgeData> {
        const vCloner = vertexCloner !== undefined ? vertexCloner : (vertex: TVertex) => vertex;
        const eCloner = edgeDataCloner !== undefined ? edgeDataCloner : (data: TEdgeData) => data;
        return this.map(vCloner, eCloner);
    }

    canContractEdge(from: TVertex, to: TVertex): boolean {
        return canContractEdge(this, from, to);
    }

    contractEdge(from: TVertex, to: TVertex, vertexMerger?: BinaryOperator<TVertex>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        return contractEdge(this, from, to, vertexMerger, edgeMerger);
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

    getEdgeDataTo(vertex: TVertex): Iterator<TEdgeData> {
        const b = this.backward.get(vertex);
        if (b === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(b.values(), data => data !== undefined) as Iterator<TEdgeData>;
    }

    getEdgeDataFrom(vertex: TVertex): Iterator<TEdgeData> {
        const f = this.forward.get(vertex);
        if (f === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(f.values(), data => data !== undefined) as Iterator<TEdgeData>;
    }

    setEdgeData(from: TVertex, to: TVertex, data: TEdgeData | undefined): boolean {
        const f = this.forward.get(from);
        const b = this.backward.get(to);
        if (!f || !b || !f.has(to) || !b.has(from)) {
            return false;
        }
        f.set(to, data);
        b.set(from, data);
        return true;
    }

    getEdges(): Iterator<Pair<TVertex>> {
        return createFlatMappedIterator(this.forward.entries(), entry =>
            createMappedIterator(entry[1].keys(), key => [entry[0], key] as Pair<TVertex>));
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

    canAddEdge(from: TVertex, to: TVertex): boolean {
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

        // check if this edge creates a cycle (or if the edge exists already)
        if (f.has(to) || !this.detector.canAddEdge(this.adapter, from, to)) {
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
        return true;
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

        // check if this edge creates a cycle (or if the edge exists already)
        if (f.has(to) || !this.detector.canAddEdge(this.adapter, from, to)) {
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
        f.set(to, edgeData);
        b.set(from, edgeData);
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

    private addToBackwardsMap(from: TVertex, to: TVertex, edgeData: TEdgeData | undefined): void {
        let map = this.backward.get(to);
        if (map === undefined) {
            this.backward.set(to, map = new this.mapConstructor());
        }
        map.set(from, edgeData);
    }

    private getData(key: TVertex): VertexData {
        return this.vertices.get(key) as VertexData;
    }
}
