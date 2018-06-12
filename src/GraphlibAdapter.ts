import { BinaryOperator, Pair, PartialExcept, PartialFor, RemoveFrom, TypedFunction, UnaryOperator } from "andross";
import { Graph } from "graphlib";
import { CommonAdapter, CycleDetector, GraphAdapter, GraphlibAdapterOptions, GraphlibConstructor, GraphlibVertexData, VertexData } from "./Header";
import { PearceKellyDetector } from "./PearceKellyDetector";
import { assign, canContractEdge, contractEdge, createFilteredIterator, createMappedArrayIterator, EmptyIterator } from "./util";

// tslint:disable-next-line:ban-types
function bind<T extends Function>(fn: T, context: any): T {
    return fn.bind(context);
}

/**
 * Adapter for the npm `graphlib` module. You need to add `graphlib` as a dependency and
 * pass a reference to the graphlib Graph constructor to the constructor of this class.
 *
 * @see {@link CommonAdapter}
 */
export class GraphlibAdapter<TVertexData extends GraphlibVertexData = any, TEdgeData = any> implements CommonAdapter<TVertexData, TEdgeData> {
    static create<TVertexData extends GraphlibVertexData = any, TEdgeData = any>(options: PartialExcept<GraphlibAdapterOptions<TVertexData>, "graphlib">): GraphlibAdapter<TVertexData, TEdgeData> {
        const g = new options.graphlib(assign(options.graphOptions || {}, {directed: true}));
        const detector = options.cycleDetector || new PearceKellyDetector();
        return new GraphlibAdapter(g, detector, options.graphlib);
    }

    private g: Graph;
    private graphlib: GraphlibConstructor;
    private detector: CycleDetector<TVertexData>;
    private adapter: GraphAdapter<TVertexData>;

    private constructor(g: Graph, detector: CycleDetector<TVertexData>, graphlib: GraphlibConstructor) {
        this.graphlib = graphlib;
        this.g = g;
        this.detector = detector;
        this.adapter = {
            getData: bind(this.getData, this),
            getPredecessorsOf: bind(this.getPredecessorsOf, this),
            getSuccessorsOf: bind(this.getSuccessorsOf, this),
        };
    }

    map<TClonedVertexData extends TVertexData, TClonedEdgeData>(vertexDataMapper: TypedFunction<TVertexData, PartialFor<TClonedVertexData, keyof GraphlibVertexData>>, edgeDataMapper: TypedFunction<TEdgeData, TClonedEdgeData>): GraphlibAdapter<TClonedVertexData, TClonedEdgeData> {
        // Clone the graphlib graph and map the vertices and edges.
        const clonedG = new this.graphlib({
            compound: this.g.isCompound(),
            directed: this.g.isDirected(),
            multigraph: this.g.isMultigraph(),
        });
        for (const node of this.g.nodes()) {
            const vertexData = this.g.node(node) as TVertexData;
            const partialVertexData: PartialFor<TClonedVertexData, keyof GraphlibVertexData> = vertexDataMapper(vertexData);
            if (partialVertexData.gid === undefined) {
                partialVertexData.gid = vertexData.gid;
            }
            partialVertexData.order = vertexData.order;
            partialVertexData.visited = vertexData.visited;
            clonedG.setNode(partialVertexData.gid, partialVertexData);
        }
        for (const edge of this.g.edges()) {
            const edgeData = this.g.edge(edge) as TEdgeData;
            clonedG.setEdge(edge.v, edge.w, edgeData !== undefined ? edgeDataMapper(edgeData) : undefined, edge.name);
        }
        // Clone the detector.
        const clonedDetector = this.detector.map<TVertexData>();
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
        return this.map(vCloner, eCloner);
    }

    canContractEdge(from: TVertexData, to: TVertexData): boolean {
        return canContractEdge(this, from, to);
    }

    contractEdge(from: TVertexData, to: TVertexData, vertexMerger?: BinaryOperator<TVertexData>, edgeMerger?: BinaryOperator<TEdgeData>): boolean {
        return contractEdge(this, from, to, vertexMerger, edgeMerger);
    }

    isReachable(source: TVertexData, target: TVertexData): boolean {
        return this.detector.isReachable(this.adapter, source, target);
    }

    getSuccessorsOf(vertex: TVertexData): Iterator<TVertexData> {
        const nodes = this.g.successors(vertex.gid);
        if (!nodes) {
            return EmptyIterator;
        }
        return createMappedArrayIterator(nodes, node => this.g.node(node));
    }

    getPredecessorsOf(vertex: TVertexData): Iterator<TVertexData> {
        const nodes = this.g.predecessors(vertex.gid);
        if (!nodes) {
            return EmptyIterator;
        }
        return createMappedArrayIterator(nodes, node => this.g.node(node));
    }

    hasEdge(from: TVertexData, to: TVertexData): boolean {
        return this.g.hasEdge(from.gid, to.gid);
    }

    hasVertex(vertex: TVertexData): boolean {
        return this.g.hasNode(vertex.gid);
    }

    getVertexCount(): number {
        return this.g.nodeCount();
    }

    getEdgeCount(): number {
        return this.g.edgeCount();
    }

    getEdgeDataFrom(vertex: TVertexData): Iterator<TEdgeData> {
        const edges = this.g.outEdges(vertex.gid);
        if (edges === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(createMappedArrayIterator(edges, edge => this.g.edge(edge.v, edge.w) as TEdgeData), data => data !== undefined);
    }

    getEdgeDataTo(vertex: TVertexData): Iterator<TEdgeData> {
        const edges = this.g.inEdges(vertex.gid);
        if (edges === undefined) {
            return EmptyIterator;
        }
        return createFilteredIterator(createMappedArrayIterator(edges, edge => this.g.edge(edge.v, edge.w) as TEdgeData), data => data !== undefined);
    }

    getEdgeData(from: TVertexData, to: TVertexData): TEdgeData {
        return this.g.edge(from.gid, to.gid);
    }

    setEdgeData(from: TVertexData, to: TVertexData, data: TEdgeData): boolean {
        if (!this.g.hasEdge(from.gid, to.gid)) {
            return false;
        }
        this.g.setEdge(from.gid, to.gid, data);
        return true;
    }

    getVertices(): Iterator<TVertexData> {
        return createMappedArrayIterator(this.g.nodes(), node => this.g.node(node) as TVertexData);
    }

    getEdges(): Iterator<Pair<TVertexData>> {
        return createMappedArrayIterator(this.g.edges(), edge => [this.g.node(edge.v) as TVertexData, this.g.node(edge.w) as TVertexData] as Pair<TVertexData>);
    }

    supportsOrder(): boolean {
        return this.detector.supportsOrder();
    }

    getOrder(vertex: TVertexData): number {
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

    canAddEdge(from: TVertexData, to: TVertexData): boolean {
        if (this.g.hasEdge(from.gid, to.gid)) {
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

    addEdge(from: TVertexData, to: TVertexData, data?: TEdgeData): boolean {
        // Check if edge exists already, if so, do nothing
        if (this.g.hasEdge(from.gid, to.gid)) {
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
        this.g.setEdge(from.gid, to.gid, data);
        return true;
    }

    createVertex(data: RemoveFrom<TVertexData & GraphlibVertexData, VertexData>): TVertexData {
        const vertexData = this.detector.createVertexData(this.adapter);
        return assign(vertexData, data) as any as TVertexData;
    }

    addVertex(vertex: TVertexData): boolean {
        if (this.hasVertex(vertex as any as TVertexData)) {
            return false;
        }
        this.g.setNode(vertex.gid, vertex);
        return true;
    }

    deleteEdge(from: TVertexData, to: TVertexData): boolean {
        if (!this.g.hasEdge(from.gid, to.gid)) {
            return false;
        }
        this.g.removeEdge(from.gid, to.gid);
        return true;
    }

    deleteVertex(vertex: TVertexData): boolean {
        if (!this.g.hasNode(vertex.gid)) {
            return false;
        }
        this.detector.onVertexDeletion(this.adapter, vertex);
        this.g.removeNode(vertex.gid);
        return true;
    }

    private getData(vertex: TVertexData): VertexData {
        return this.g.node(vertex.gid);
    }
}
