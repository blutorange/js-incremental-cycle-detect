import { BinaryOperator, Maybe, Pair, Quadruple, Triple, TypedFunction, UnaryOperator } from "andross";
import { GenericGraphAdapter } from "./GenericGraphAdapter";
import { ClonableAdapter, CommonAdapter, GraphFactory, MultiGraphAdapterOptions, MultiGraphEdgeData } from "./Header";
import { createFilteredIterator, createFlatMappedIterator, createMappedIterator, EmptyIterator, forEach, takeFirst } from "./util";

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
        return new MultiGraphAdapter<TVertex, TEdgeData, TEdgeLabel>(graphFactory, 0, mapConstructor);
    }

    private edgeCount: number;
    private readonly g: CommonAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>> & ClonableAdapter<TVertex, MultiGraphEdgeData<TEdgeData, TEdgeLabel>>;
    private readonly mapConstructor: MapConstructor;

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
    addLabeledEdge(from: TVertex, to: TVertex, label: Maybe<TEdgeLabel>, data?: TEdgeData): boolean {
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

    /**
     * If a label is given, restricts the returned result to edges with that label.
     * @see {@link CommonAdapter}#getEdgesWithDataTo
     */
    getEdgesWithDataTo(vertex: TVertex, label?: TEdgeLabel): Iterator<Pair<TVertex, Maybe<TEdgeData>>> {
        return createFlatMappedIterator(this.g.getEdgesWithDataTo(vertex), pair => {
            const map = pair[1];
            if (map === undefined) {
                return EmptyIterator as Iterator<Pair<TVertex, Maybe<TEdgeData>>>;
            }
            if (label === undefined) {
                return createMappedIterator(map.values(), edgeData => [pair[0], edgeData] as Pair<TVertex, Maybe<TEdgeData>>);
            }
            return createMappedIterator(createFilteredIterator(map.entries(), entry => entry[0] === label), entry => [pair[0], entry[1]] as Pair<TVertex, Maybe<TEdgeData>>);
        });
    }

    /**
     * If a label is given, restricts the returned result to edges with that label.
     * @see {@link CommonAdapter}#getEdgesWithDataFrom
     */
    getEdgesWithDataFrom(vertex: TVertex, label?: TEdgeLabel): Iterator<Pair<TVertex, Maybe<TEdgeData>>> {
        return createFlatMappedIterator(this.g.getEdgesWithDataFrom(vertex), pair => {
            const map = pair[1];
            if (map === undefined) {
                return EmptyIterator as Iterator<Pair<TVertex, Maybe<TEdgeData>>>;
            }
            if (label === undefined) {
                return createMappedIterator(map.values(), edgeData => [pair[0], edgeData] as Pair<TVertex, Maybe<TEdgeData>>);
            }
            return createMappedIterator(createFilteredIterator(map.entries(), entry => entry[0] === label), entry => [pair[0], entry[1]] as Pair<TVertex, Maybe<TEdgeData>>);
        });
    }

    /**
     * If a label is given, restricts the returned result to edges with that label.
     * @see {@link CommonAdapter}#getEdgeDataTo
     */
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

    /**
     * If a label is given, restricts the returned result to edges with that label.
     * @see {@link CommonAdapter}#getEdgeDataFrom
     */
    getEdgeDataFrom(vertex: TVertex, label?: TEdgeLabel): Iterator<TEdgeData> {
        if (label === undefined) {
            return createFilteredIterator(
                createFlatMappedIterator(this.g.getEdgeDataFrom(vertex), data => data ? data.values() : EmptyIterator),
                data => data !== undefined
            ) as Iterator<TEdgeData>;
        }
        return createMappedIterator(
                createFilteredIterator(
                    createFlatMappedIterator(this.g.getEdgeDataFrom(vertex), data => data.entries()),
                entry => entry[1] !== undefined && entry[0] === label),
            entry => entry[1]) as Iterator<TEdgeData>;
    }

    /**
     * This contracts two vertices, ie. all edges between the given vertices.
     * @see {@link MultiGraphAdapter}#contractLabeledEdge
     */
    contractEdge(from: TVertex, to: TVertex, vertexMerger?: BinaryOperator<TVertex>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        // Check how many labeled edges would be deleted.
        let deletionCount = 0;
        const data = this.g.getEdgeData(from, to);
        if (data !== undefined) {
            deletionCount = data.size;
        }
        // Perform the contraction
        const wasContracted = this.g.contractEdge(from, to, vertexMerger, createMerger(edgeMerger, this.mapConstructor));
        // Update the labeled edge count iff the edge could be contracted.
        if (wasContracted) {
            this.edgeCount -= deletionCount;
        }
        // Return the result
        return wasContracted;
    }

    /**
     * This contract a specific labeled edge between the given vertices. Note that cycles are not allowed, so
     * if there exists more than one edge between the given vertices, the contraction cannot be performed as
     * that would create a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param label Label of the edge to be deleted.
     * @param vertexMerger The vertex that replaces the two old vertices. If not given, defaults to `from`.
     * @param dataMerger Another vertex may be connected two both of the vertices that are to be contracted.
     * In this case, their edge data needs to be merged. If not given, defaults to taking the edge data from
     * one edge.
     * @return `true` iff the edge was contracted.
     * @throws If vertex merger returns a vertex that is already contained in the graph.
     * @see {@link MultiGraphAdapter}#contractEdge
     */
    contractLabeledEdge(from: TVertex, to: TVertex, label?: TEdgeLabel, vertexMerger?: BinaryOperator<TVertex>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        // Cannot contract edge if there is no edge or more than one edge between the given vertices.
        if (this.getEdgeCountBetween(from, to) !== 1) {
            return false;
        }
        if (!this.hasLabeledEdge(from, to, label)) {
            return false;
        }
        // Only one edge betweem the given vertices, do a normal edge contraction.
        return this.contractEdge(from, to, vertexMerger, edgeMerger);
    }

    /**
     * This check if a specific labeled edge between the given vertices can be contracted. Note that cycles are not
     * allowed, so if there exists more than one edge between the given vertices, the contraction cannot be
     * performed as that would create a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param label Label of the edge to be deleted.
     * @return `true` iff the edge can be contracted, `false` otherwise.
     */
    canContractLabeledEdge(from: TVertex, to: TVertex, label?: TEdgeLabel): boolean {
        if (this.getEdgeCountBetween(from, to) !== 1) {
            return false;
        }
        if (!this.hasLabeledEdge(from, to, label)) {
            return false;
        }
        return this.canContractEdge(from, to);
    }

    /**
     * This check if a single labeled edge between the given vertices can be contracted. Note that cycles are not
     * allowed, so if there exists more than one edge between the given vertices, the contraction cannot be
     * performed as that would create a cycle.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @return `true` iff the edge can be contracted, `false` otherwise.
     */
    canContractOneEdge(from: TVertex, to: TVertex): boolean {
        if (this.getEdgeCountBetween(from, to) !== 1) {
            return false;
        }
        return this.canContractEdge(from, to);
    }

    canContractEdge(from: TVertex, to: TVertex): boolean {
        return this.g.canContractEdge(from, to);
    }

    /**
     * Deletes the edges with the given label, which may be `undefined`.
     * @param from Source vertex of the edge.
     * @param to Target vertex of the edge.
     * @param label Label of the edge.
     * @return `true` iff an edge was deleted.
     */
    deleteLabeledEdge(from: TVertex, to: TVertex, label: Maybe<TEdgeLabel>): boolean {
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

    /**
     * If label is `undefined`, deletes all edges between the two given vertices.
     * @see {@link CommonAdapter}#deleteEdge
     */
    deleteEdge(from: TVertex, to: TVertex, label?: TEdgeLabel): boolean {
        if (label === undefined) {
            this.edgeCount -= this.getEdgeCountBetween(from, to);
            return this.g.deleteEdge(from, to);
        }
        return this.deleteLabeledEdge(from, to, label);
    }

    /**
     * Deletes a vertex from the graph; and all incident egdes.
     * @param vertex Vertex to be deleted.
     * @return Whether the vertex was deleted. That is, it returns `false` in case the given vertex was not contained in this graph.
     */
    deleteVertex(vertex: TVertex): boolean {
        // Update labeled edge count
        forEach(data => {
            const edges = data[1];
            if (edges !== undefined) {
                this.edgeCount -= edges.size;
            }
        }, this.g.getEdgesWithDataFrom(vertex), this.g.getEdgesWithDataTo(vertex));
        // Delete the vertex
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

    getEdgesWithData(): Iterator<Triple<TVertex, TVertex, Maybe<TEdgeData>>> {
        return createFlatMappedIterator(this.g.getEdgesWithData(), entry =>
            createMappedIterator((entry[2] as MultiGraphEdgeData<TEdgeData, TEdgeLabel>).values(), data => [
                entry[0],
                entry[1],
                data
            ] as Triple<TVertex, TVertex, Maybe<TEdgeData>>));
    }

    getLabeledEdgesWithData(): Iterator<Quadruple<TVertex, TVertex, Maybe<TEdgeData>, Maybe<TEdgeLabel>>> {
        return createFlatMappedIterator(this.g.getEdgesWithData(), entry =>
            createMappedIterator((entry[2] as MultiGraphEdgeData<TEdgeData, TEdgeLabel>).entries(), subEntry => [
                entry[0],
                entry[1],
                subEntry[1],
                subEntry[0]
            ] as Quadruple<TVertex, TVertex, Maybe<TEdgeData>, Maybe<TEdgeLabel>>));
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
