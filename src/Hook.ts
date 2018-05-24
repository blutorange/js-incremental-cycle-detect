import { IncrementalTopSortHook, GraphAdapter, Algo, VertexData } from './Header';

export class HookImpl<TVertex, TVertexData extends VertexData> implements IncrementalTopSortHook<TVertex, TVertexData> {
    constructor(private adapter: GraphAdapter<TVertex, TVertexData>, private algo: Algo<TVertex, TVertexData>) {}

    addVertex(vertex: TVertex): void {
        const data = this.algo.createVertex(this.adapter, vertex);
        this.adapter.addVertex(vertex);
        this.adapter.setData(vertex, data);
    }

    addEdge(from: TVertex, to: TVertex): boolean {
        if (!this.adapter.hasVertex(from)) this.addVertex(from);
        if (!this.adapter.hasVertex(to)) this.addVertex(to);
        if (this.adapter.hasEdge(from, to)) return true;
        if (!this.algo.addEdge(this.adapter, from, to)) return false;
        this.adapter.addEdge(from, to);
        return true;
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        this.algo.deleteEdge(from, to);
        this.adapter.deleteEdge(from, to);
    }

    deleteVertex(vertex: TVertex): void {
        this.adapter.deleteData(vertex);
        this.algo.deleteVertex(this.adapter, vertex);
        this.adapter.deleteVertex(vertex);
    }

    unwrap(): GraphAdapter<TVertex, TVertexData> {
        return this.adapter;
    }
}
