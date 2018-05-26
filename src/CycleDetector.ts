import { CycleDetector, GraphAdapter } from "./Header";
import { Algo } from "./InternalHeader";

export class CycleDetectorImpl<TVertex, TGraphAdapter extends GraphAdapter<TVertex> = GraphAdapter<TVertex>> implements CycleDetector<TVertex, TGraphAdapter> {
    constructor(private adapter: TGraphAdapter, private algo: Algo<TVertex>) {}

    addVertex(vertex: TVertex): void {
        const data = this.algo.createVertex(this.adapter, vertex);
        this.adapter.addVertex(vertex);
        this.adapter.setData(vertex, data);
    }

    addEdge(from: TVertex, to: TVertex, id?: number): boolean {
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
        this.adapter.addEdge(from, to, id);
        return true;
    }

    deleteEdge(from: TVertex, to: TVertex, id?: number): void {
        this.algo.deleteEdge(from, to);
        this.adapter.deleteEdge(from, to, id);
    }

    deleteVertex(vertex: TVertex): void {
        this.adapter.deleteData(vertex);
        this.algo.deleteVertex(this.adapter, vertex);
        this.adapter.deleteVertex(vertex);
    }

    isReachable(from: TVertex, to: TVertex): boolean {
        return this.algo.isReachable(from, to, this.adapter);
    }

    unwrap(): TGraphAdapter {
        return this.adapter;
    }

    /*
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
    }*/
}
