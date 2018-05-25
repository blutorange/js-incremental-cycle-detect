import { Algo, GraphAdapter, IncrementalTopSortHook } from "./Header";

export class HookImpl<TVertex> implements IncrementalTopSortHook<TVertex> {
    constructor(private adapter: GraphAdapter<TVertex>, private algo: Algo<TVertex>) {}

    addVertex(vertex: TVertex): void {
        const data = this.algo.createVertex(this.adapter, vertex);
        this.adapter.addVertex(vertex);
        this.adapter.setData(vertex, data);
    }

    addEdge(from: TVertex, to: TVertex): boolean {
        // self cycle
        if (from === to) {
            return false;
        }
        // check sanity, do vertices exist?
        if (!this.adapter.hasVertex(from)) {
            this.addVertex(from);
        }
        if (!this.adapter.hasVertex(to)) {
            this.addVertex(to);
        }
        if (!this.adapter.hasEdge(from, to)) {
            if (!this.algo.addEdge(this.adapter, from, to)) {
                return false;
            }
        }
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

    contractEdge(from: TVertex, to: TVertex): boolean {
        if (!this.adapter.hasEdge(from, to)) {
            return false;
        }
        this.deleteEdge(from, to);
        if (this.algo.isReachable(from, to, this.adapter)) {
            this.addEdge(from, to);
            return false;
        }
        this.adapter.getSuccessorsOf(to) {
            this.deleteEdge(to);
        }
    }
}
