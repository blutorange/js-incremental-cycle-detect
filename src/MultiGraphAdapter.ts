import { BinaryOperator, Maybe, Pair, Triple, TypedFunction, UnaryOperator } from "andross";
import { GenericGraphAdapter } from "./GenericGraphAdapter";
import { ClonableAdapter, CommonAdapter, GraphFactory, MultiGraphAdapterOptions, MultiGraphEdgeData } from "./Header";
import { createFilteredIterator, createFlatMappedIterator, createMappedIterator, EmptyIterator, takeFirst } from "./util";

// When contracting an edge, we may need to combine the edge data, ie. the map
// between the edge labels and the actual edge data.
function createMerger<TEdgeData, TEdgeLabel>(edgeMerger: BinaryOperator<TEdgeData> = takeFirst, mapConstructor: MapConstructor): BinaryOperator<MultiGraphEdgeData<TEdgeData, TEdgeLabel>> {
    return (first: MultiGraphEdgeData<TEdgeData, TEdgeLabel>, second: MultiGraphEdgeData<TEdgeData, TEdgeLabel>): MultiGraphEdgeData<TEdgeData, TEdgeLabel> => {
        if (first === undefined) {
            return second || new mapConstructor();
        }
        if (second === undefined) {
            return first;
        }
        for (let it = second.entries(), res = it.next(); !res.done; res = it.next()) {
            let data = first.get(res.value[0]);
            if (data === undefined) {
                data = res.value[1];
            }
            else {
                const other = res.value[1];
                data = other !== undefined ? edgeMerger(data, other) : data;
            }
            first.set(res.value[0], data);
        }
        return first;
    };
}

/**
 * Generic graph data structure similar to {@link CommonAdapter}. It additionally
 * supports multiple edges between two vertices. An edge is identified by its label. Labels
 * are compared by a `Map`, ie. `===`.
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
 * const graph = MultiGraphAdapter.create<Vertex, string>();
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
 * @typeparam TVertex Type of the vertices of this graph.
 * @typeparam TEdgeData Type of the data associated with edges.
 * @typeparam TEdgeLabel Type of the label used to distiniguish different between edges with the same source and target vertex.
 * @see {@link CommonAdapter}
 * @see {@link CommonAdapter}
 */
export class MultiGraphAdapter<TVertex = any, TEdgeData = any, TEdgeLabel = any> implements CommonAdapter<TVertex, TEdgeData>, ClonableAdapter<TVertex, TEdgeData> {
    /**
     * Creates a new graph adapter with the given options.
     * @param options Options for configuring this instance.
     * @see {@link CommonAdapterOptions}
     * @typeparam TVertex Type of the vertices of this graph.
     * @typeparam TEdgeData Type of the data associated with edges.
     * @typeparam TEdgeLabel Type of the label used to distiniguish different between edges with the same source and target vertex.
     */
    static create<TVertex = any, TEdgeData = any, TEdgeLabel = any>(options: Partial<MultiGraphAdapterOptions<TVertex, TEdgeData, TEdgeLabel>> = {}): MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel> {
        const graphFactory = options.graphFactory || GenericGraphAdapter.create;
        const mapConstructor = options.mapConstructor || Map;
        return new MultiGraphAdapter(graphFactory, 0, mapConstructor);
    }

    private g: CommonAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>> & ClonableAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>>;
    private edgeCount: number;
    private mapConstructor: MapConstructor;

    private constructor(graphFactory: GraphFactory<TVertex, TEdgeData, TEdgeLabel>, edgeCount: number, mapConstructor: MapConstructor) {
        this.g = graphFactory();
        this.edgeCount = edgeCount;
        this.mapConstructor = mapConstructor;
    }

    /**
     * Creates an independent copy of this graph data structure and maps
     * each vertex and edge datum to a new vertex and edge datum and edge label.
     * Further changes to this graph are not reflected in the returned copy, and
     * vice-versa.
     *
     * @param vertexMapper Mapping function that takes a vertex and returns a mapped copy of it.
     * @param edgeDataMapper Mapping function that takes an edge datum and returns a mapped copy of it.
     * @param labelMapper Mapping function that takes a label and returns a mapped copy of it.
     * @return A mapped copy of this graph.
     * @typeparam TClonedVertex Type of the mapped vertices.
     * @typeparam TClonedEdgeData Type of the cloned edge data.
     * @typeparam TClonedEdgeLabel Type of the cloned edge label.
     */
    mapLabeled<TClonedVertex, TClonedEdgeData, TClonedEdgeLabel>(vertexMapper: TypedFunction<TVertex, TClonedVertex>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>, labelMapper: TypedFunction<TEdgeLabel, TClonedEdgeLabel>): MultiGraphAdapter<TClonedVertex, TClonedEdgeData, TClonedEdgeLabel> {
        const g = this.g.map<TClonedVertex, MultiGraphEdgeData<TClonedEdgeData, TClonedEdgeLabel>>(vertexMapper, edgeLabelToEdgeDataMap => {
            // Create a copy of the edge label to edge data map, applying the given mappers
            const clonedEdgeLabelToEdgeDataMap: MultiGraphEdgeData<TClonedEdgeData, TClonedEdgeLabel> = new this.mapConstructor();
            edgeLabelToEdgeDataMap.forEach((edgeData, edgeLabel) => {
                const clonedEdgeData = edgeData !== undefined ? edgeDataMapper(edgeData) : undefined;
                const clonedEdgeLabel = edgeLabel !== undefined ? labelMapper(edgeLabel) : undefined;
                clonedEdgeLabelToEdgeDataMap.set(clonedEdgeLabel, clonedEdgeData);
            });
            return clonedEdgeLabelToEdgeDataMap;
        });
        return new MultiGraphAdapter<TClonedVertex, TClonedEdgeData, TClonedEdgeLabel>(() => g, this.edgeCount, this.mapConstructor);
    }

    map<TClonedVertex, TClonedEdgeData>(vertexMapper: TypedFunction<TVertex, TClonedVertex>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>): MultiGraphAdapter<TClonedVertex, TClonedEdgeData, TEdgeLabel> {
        return this.mapLabeled(vertexMapper, edgeDataMapper, label => label);
    }

    clone(vertexCloner?: UnaryOperator<TVertex>, edgeDataCloner?: UnaryOperator<TEdgeData>, labelCloner?: UnaryOperator<TEdgeLabel>): MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel> {
        const vCloner = vertexCloner !== undefined ? vertexCloner : (vertex: TVertex) => vertex;
        const eCloner = edgeDataCloner !== undefined ? edgeDataCloner : (data: TEdgeData) => data;
        const lCloner = labelCloner !== undefined ? labelCloner : (label: TEdgeLabel) => label;
        return this.mapLabeled(vCloner, eCloner, lCloner);
    }

    /**
     * Same as {@link MultiGraphAdapter}#addEdge, but with the `data` and `label` arguments
     * reversed for convenience.
     * @see {@link MultiGraphAdapter}#addEdge
     */
    addLabeledEdge(from: TVertex, to: TVertex, label?: TEdgeLabel, data?: TEdgeData) {
        return this.addEdge(from, to, data, label);
    }

    canAddEdge(from: TVertex, to: TVertex, label?: TEdgeLabel): boolean {
        const srcData = this.g.getEdgeData(from, to);
        if (srcData !== undefined) {
            if (srcData.has(label)) {
                return false;
            }
            return true;
        }
        return this.g.canAddEdge(from, to);
    }

    /**
     * If no label is given, defaults to `undefined` for the label.
     * @see {@link CommonAdapter}#addEdge
     */
    addEdge(from: TVertex, to: TVertex, data?: TEdgeData, label?: TEdgeLabel): boolean {
        const srcData = this.g.getEdgeData(from, to);
        if (srcData !== undefined) {
            // Second or more edge between these vertices.
            if (srcData.has(label)) {
                // Do nothing if edge exists already.
                return false;
            }
            srcData.set(label, data);
            this.edgeCount += 1;
            return true;
        }
        // First edge between these vertices.
        this.edgeCount += 1;
        const newData: MultiGraphEdgeData<TEdgeData, TEdgeLabel> = new Map();
        newData.set(label, data);
        return this.g.addEdge(from, to, newData);
    }

    addVertex(vertex: TVertex): boolean {
        return this.g.addVertex(vertex);
    }

    getEdgeDataTo(vertex: TVertex, label?: TEdgeLabel): Iterator<TEdgeData> {
        if (label === undefined) {
            return createFilteredIterator(createFlatMappedIterator(this.g.getEdgeDataTo(vertex), data => data ? data.values() : EmptyIterator), data => data !== undefined) as Iterator<TEdgeData>;
        }
        return createMappedIterator(
                createFilteredIterator(
                    createFlatMappedIterator(this.g.getEdgeDataTo(vertex), data => data ? data.entries() : EmptyIterator),
                entry => entry[1] !== undefined && entry[0] === label),
            entry => entry[1]) as Iterator<TEdgeData>;
    }

    getEdgeDataFrom(vertex: TVertex, label?: TEdgeLabel): Iterator<TEdgeData> {
        if (label === undefined) {
            return createFilteredIterator(createFlatMappedIterator(this.g.getEdgeDataFrom(vertex), data => data ? data.values() : EmptyIterator), data => data !== undefined) as Iterator<TEdgeData>;
        }
        return createMappedIterator(
                createFilteredIterator(
                    createFlatMappedIterator(this.g.getEdgeDataFrom(vertex), data => data ? data.entries() : EmptyIterator),
                entry => entry[1] !== undefined && entry[0] === label),
            entry => entry[1]) as Iterator<TEdgeData>;
    }

    /**
     * This contracts two vertices, ie. all edges between the given vertices.
     * See {@link CommonAdapter}#contractEdge.
     */
    contractEdge(from: TVertex, to: TVertex, vertexMerger?: BinaryOperator<TVertex>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        return this.g.contractEdge(from, to, vertexMerger, createMerger(edgeMerger, this.mapConstructor));
    }

    canContractEdge(from: TVertex, to: TVertex): boolean {
        return this.g.canContractEdge(from, to);
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
     * This returns the number of all edges, ie. including multiple
     * edges between the same vertices.
     * @return The number of edges in this graph, counting each multiple edge.
     */
    getLabeledEdgeCount(): number {
        return this.edgeCount;
    }

    /**
     * @return The number of edges between two distinct vertices, ie. not including
     * multiple edges between the same vertices.
     * @see {@link CommonAdapter}#getEdgeCount
     */
    getEdgeCount(): number {
        return this.g.getEdgeCount();
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
            return false;
        }
        d.set(label, data);
        return true;
    }

    getEdges(): Iterator<Pair<TVertex>> {
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

    /**
     * Similar to {@link MultiGraphAdapter}#getEdges, but returns all edges
     * between the vertices.
     * @return All edges between the vertices. An edge is identified by its source
     * vertex, its target vertex and its label.
     */
    getLabeledEdges(): Iterator<Triple<TVertex, TVertex, Maybe<TEdgeLabel>>> {
        // For each edge, get all labels and output one result for each label.
        return createFlatMappedIterator(this.g.getEdges(), (edge: Pair<TVertex>): Iterator<Triple<TVertex, TVertex, Maybe<TEdgeLabel>>> => {
            const data = this.g.getEdgeData(edge[0], edge[1]);
            if (data === undefined) {
                return EmptyIterator;
            }
            return createMappedIterator(data.keys(), key => [edge[0], edge[1], key] as Triple<TVertex, TVertex, Maybe<TEdgeLabel>>);
        });
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
        return createFilteredIterator(this.g.getPredecessorsOf(vertex), from => {
            const data = this.g.getEdgeData(from, vertex);
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

    /**
     * Similar to {@link MultiGraphAdapter}#hasEdge, but if `undefined` is
     * given for the label, checks whether an edge with an `undefined` label exists.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param label Label the edge must have.
     * @return Whether this graph contains an edge form the given source to the target with the given label.
     */
    hasLabeledEdge(from: TVertex, to: TVertex, label: TEdgeLabel | undefined): boolean {
        const data = this.g.getEdgeData(from, to);
        // No label given and edge exsists, or edge with given label exists.
        return data !== undefined && data.has(label);
    }

    hasVertex(vertex: TVertex): boolean {
        return this.g.hasVertex(vertex);
    }

    isReachable(source: TVertex, target: TVertex): boolean {
        return this.g.isReachable(source, target);
    }
}
