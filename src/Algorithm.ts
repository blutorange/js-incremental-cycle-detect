import { CommonAdapter, WeaklyConnectedComponent } from "./Header";
import { createChainedIterator } from "./util";

/**
 * Some common methods and algorithms that are not specific to a graph
 * data structure implementation.
 */
export class Algorithm {
    /**
     * Finds all weakly connected components of the graph.
     * @param graph Graph data structure to use.
     * @param setConstructor Optional `Set` implementation.
     * @return The weakly connected components of the given graph.
     */
    static findWeaklyConnectedComponents<TVertex, TEdgeData>(graph: CommonAdapter<TVertex, TEdgeData>, setConstructor: SetConstructor = Set): WeaklyConnectedComponent<TVertex, TEdgeData>[] {
        const visited: Set<TVertex> = new setConstructor();
        const components: WeaklyConnectedComponent<TVertex, TEdgeData>[] = [];
        for (let vertexIterator = graph.getVertices(), vertexResult = vertexIterator.next(); !vertexResult.done; vertexResult = vertexIterator.next()) {
            // Check if we processed this vertex already.
            if (visited.has(vertexResult.value)) {
                continue;
            }
            // Create a new component and search for all parts of this component
            const component: WeaklyConnectedComponent<TVertex, TEdgeData> = {edges: [], vertices: [vertexResult.value]};
            const stack: TVertex[] = [vertexResult.value];
            visited.add(vertexResult.value);
            while (stack.length > 0) {
                const vertex = stack.pop() as TVertex;
                // backwards
                for (let edgeIterator = graph.getEdgesWithDataTo(vertex), edgeResult = edgeIterator.next(); !edgeResult.done; edgeResult = edgeIterator.next()) {
                    const v = edgeResult.value[0];
                    if (visited.has(v)) {
                        continue;
                    }
                    visited.add(v);
                    component.vertices.push(v);
                    stack.push(v);
                }
                // forwards
                for (let edgeIterator = graph.getEdgesWithDataFrom(vertex), edgeResult = edgeIterator.next(); !edgeResult.done; edgeResult = edgeIterator.next()) {
                    const v = edgeResult.value[0];
                    component.edges.push([vertex, v, edgeResult.value[1]]);
                    if (visited.has(v)) {
                        continue;
                    }
                    visited.add(v);
                    component.vertices.push(v);
                    stack.push(v);
                }
            }
            // Add the component
            components.push(component);
        }
        return components;
    }

    /**
     * Returns an iterator over the given vertices predecessors and successors, in that order.
     * @param graph A graph data structure.
     * @param vertex Vertex whose predecessors and successors are fetched.
     * @return The vertex's predecessors and successors in that order.
     */
    static getNeighbors<TVertex>(graph: CommonAdapter<TVertex>, vertex: TVertex): Iterator<TVertex> {
        return createChainedIterator(graph.getPredecessorsOf(vertex), graph.getSuccessorsOf(vertex));
    }

    private constructor() {}
}
