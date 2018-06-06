import { BinaryOperator, Pair, RemoveFrom } from "andross";
import { Graph } from "graphlib";
import { CommonAdapter, CustomVertexData, CycleDetector, GraphAdapter, GraphlibAdapterOptions, VertexData } from "./Header";
import { PartialExcept } from "./InternalHeader";
import { PearceKellyDetector } from "./PearceKellyDetector";
import { EmptyIterator, assign, canContractEdge, contractEdge, createArrayIterator, createMappedArrayIterator } from "./util";

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
