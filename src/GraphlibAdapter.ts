import { BinaryOperator, Pair, PartialExcept, PartialFor, RemoveFrom, TypedFunction, UnaryOperator } from "andross";
import { Graph } from "graphlib";
import { CommonAdapter, CustomVertexData, CycleDetector, GraphAdapter, GraphlibAdapterOptions, GraphlibConstructor, VertexData } from "./Header";
import { PearceKellyDetector } from "./PearceKellyDetector";
import { assign, canContractEdge, contractEdge, createArrayIterator, createFilteredIterator, createMappedArrayIterator, EmptyIterator } from "./util";

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency and
 * pass a reference to the graphlib Graph constructor to the constructor of this class.
 *
 * @see {@link CommonAdapter}
 */
export class GraphlibAdapter<TVertexData extends VertexData = any, TEdgeData = any> implements CommonAdapter<string, TEdgeData> {
    static create<TVertexData extends VertexData = any, TEdgeData = any>(options: PartialExcept<GraphlibAdapterOptions<string>, "graphlib">): GraphlibAdapter<TVertexData, TEdgeData> {
        const g = new options.graphlib(assign(options.graphOptions || {}, {directed: true}));
        const detector = options.cycleDetector || new PearceKellyDetector();
        return new GraphlibAdapter(g, detector, options.graphlib);
    }

    private g: Graph;
    private graphlib: GraphlibConstructor;
    private detector: CycleDetector<string>;
    private adapter: GraphAdapter<string>;

    private constructor(g: Graph, detector: CycleDetector<string>, graphlib: GraphlibConstructor) {
        this.graphlib = graphlib;
        this.g = g;
        this.detector = detector;
        this.adapter = {
            getData: this.getData.bind(this),
            getPredecessorsOf: this.getPredecessorsOf.bind(this),
            getSuccessorsOf: this.getSuccessorsOf.bind(this),
        };
    }

    /**
     * Creates an independent copy of this graph data structure and maps
     * each vertex and edge datum to a new vertex and edge datum. Further
     * changes to this graph are not reflected in the returned copy, and
     * vice-versa.
     *
     * @param vertexMapper Mapping function that each vertex to a new vertex. May be called several times for each vertex.
     * @param vertexDataMapper Mapping function that takes a vertex datum and returns a mapped copy of it.
     * @param edgeDataMapper Mapping function that takes an edge datum and returns a mapped copy of it.
     * @return A mapped copy of this graph.
     * @typeparam TClonedVertexData Type of the mapped vertex data.
     * @typeparam TClonedEdgeData Type of the cloned edge data.
     */
    map<TClonedVertexData extends VertexData, TClonedEdgeData>(vertexMapper: UnaryOperator<string>, vertexDataMapper: TypedFunction<TVertexData, PartialFor<TClonedVertexData, keyof VertexData>>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>): GraphlibAdapter<TClonedVertexData, TClonedEdgeData> {
        // Clone the graphlib graph and map the vertices and edges.
        const clonedG = new this.graphlib({
            compound: this.g.isCompound(),
            directed: this.g.isDirected(),
            multigraph: this.g.isMultigraph(),
        });
        for (const node of this.g.nodes()) {
            const vertexData = this.g.node(node) as TVertexData;
            const partialVertexData: PartialFor<TClonedVertexData, keyof VertexData> = vertexDataMapper(vertexData);
            partialVertexData.order = vertexData.order;
            partialVertexData.visited = vertexData.visited;
            clonedG.setNode(vertexMapper(node), partialVertexData);
        }
        for (const edge of this.g.edges()) {
            const edgeData = this.g.edge(edge) as TEdgeData;
            clonedG.setEdge(vertexMapper(edge.v), vertexMapper(edge.w), edgeData !== undefined ? edgeDataMapper(edgeData) : undefined, edge.name);
        }
        // Clone the detector.
        const clonedDetector = this.detector.map(vertexMapper);
        return new GraphlibAdapter<TClonedVertexData, TClonedEdgeData>(clonedG, clonedDetector, this.graphlib);
    }

    /**
     * Creates an independent copy of this graph data structure. Further
     * changes to this graph are not reflected in the returned copy, and
     * vice-versa.
     *
     * All vertices and edges are copied as-is and are not cloned, so that
     * changing the state of a vertex or edge also changes the state of the
     * vertex or edge in the copied graph.
     *
     * Optionally you can also pass a function for cloning the vertices and edges.
     *
     * @param vertexDataCloner Clone function that takes a vertex and returns a copy of it.
     * @param edgeDataCloner Clone function that takes an edge datum and returns a copy of it.
     * @return A copy of this graph.
     */
    clone(vertexDataCloner?: UnaryOperator<TVertexData>, edgeDataCloner?: UnaryOperator<TEdgeData>): GraphlibAdapter<TVertexData, TEdgeData> {
        const vCloner = vertexDataCloner !== undefined ? vertexDataCloner : (vertex: TVertexData) => vertex;
        const eCloner = edgeDataCloner !== undefined ? edgeDataCloner : (data: TEdgeData) => data;
        return this.map(v => v, vCloner, eCloner);
    }

    canContractEdge(from: string, to: string): boolean {
        return canContractEdge(this, from, to);
    }

    contractEdge(from: string, to: string, vertexMerger?: BinaryOperator<string>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        return contractEdge(this, from, to, vertexMerger, edgeMerger);
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

    getEdgeDataFrom(vertex: string): Iterator<TEdgeData> {
        const edges = this.g.outEdges(vertex);
        if (edges === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(createMappedArrayIterator(edges, edge => this.g.edge(edge.v, edge.w)), data => data !== undefined);
    }

    getEdgeDataTo(vertex: string): Iterator<TEdgeData> {
        const edges = this.g.inEdges(vertex);
        if (edges === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(createMappedArrayIterator(edges, edge => this.g.edge(edge.v, edge.w)), data => data !== undefined);
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

    canAddEdge(from: string, to: string): boolean {
        if (this.g.hasEdge(from, to)) {
            return false;
        }
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
        return true;
    }

    addEdge(from: string, to: string, data?: TEdgeData): boolean {
        // Check if edge exists already, if so, do nothing
        if (this.g.hasEdge(from, to)) {
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
        this.g.setEdge(from, to, data);
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
