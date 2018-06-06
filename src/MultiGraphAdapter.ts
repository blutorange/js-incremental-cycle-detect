import { Triple } from 'andross';
import { GenericGraphAdapter } from './GenericGraphAdapter';
import { CommonAdapter, GenericGraphAdapterOptions } from './Header';
import { EmptyIterator, createArrayIterator, createFilteredIterator } from './util';

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
