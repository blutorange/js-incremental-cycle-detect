import { BinaryOperator, Maybe, Pair, Triple } from "andross";
import { GenericGraphAdapter } from "./GenericGraphAdapter";
import { CommonAdapter, GenericGraphAdapterOptions } from "./Header";
import { createFilteredIterator, createFlatMappedIterator, createMappedIterator, EmptyIterator, takeFirst } from "./util";

type MultiGraphTargetData<TEdgeData, TEdgeLabel> = Map<TEdgeLabel | undefined, TEdgeData | undefined>;

type EdgeData<TEdgeData, TEdgeLabel> = Maybe<Map<Maybe<TEdgeLabel>, Maybe<TEdgeData>>>;

// Combine all edges that point to the first or second node to be contracted.
function createMerger<TEdgeData, TEdgeLabel>(edgeMerger: Maybe<BinaryOperator<Maybe<TEdgeData>>> = takeFirst) {
    return (first: EdgeData<TEdgeData, TEdgeLabel>, second: EdgeData<TEdgeData, TEdgeLabel>): EdgeData<TEdgeData, TEdgeLabel> => {
        if (first === undefined) {
            return second;
        }
        if (second === undefined) {
            return first;
        }
        for (let it = second.entries(), res = it.next(); !res.done; res = it.next()) {
            let data = first.get(res.value[0]);
            data = data === undefined ? res.value[1] : edgeMerger(data, res.value[1]);
            first.set(res.value[0], data);
        }
        return first;
    };
}

/**
 * Generic graph data structure similar to {@link GenericGraphAdapter}. It additionally
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
 * @typeparam TVertex Type of the vertices of this graph.
 * @typeparam TEdgeData Type of the data associated with edges.
 * @typeparam TEdgeLabel Type of the label used to distiniguish different between edges with the same source and target vertex.
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
     * Same as {@link MultiGraphAdapter}#addEdge, but with the `data` and `label` arguments
     * reversed for convenience.
     * @see {@link MultiGraphAdapter}#addEdge
     */
    addLabeledEdge(from: TVertex, to: TVertex, label?: TEdgeLabel, data?: TEdgeData) {
        return this.addEdge(from, to, data, label);
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
    contractEdge(from: TVertex, to: TVertex, vertexMerger?: BinaryOperator<TVertex>, edgeMerger?: BinaryOperator<Maybe<TEdgeData>>): boolean {
        return this.g.contractEdge(from, to, vertexMerger, createMerger(edgeMerger));
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
