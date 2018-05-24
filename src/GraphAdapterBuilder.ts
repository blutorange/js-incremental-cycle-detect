import { GraphAdapter, AssociatableGraph,  ManipulableGraph, VertexData } from './Header';
import { Builder } from "andross"

const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
}

export class MapAssociator<TVertex, TVertexData extends VertexData> implements AssociatableGraph<TVertex, TVertexData> {
    private map: Map<TVertex, TVertexData>;

    constructor(mapConstructor?: MapConstructor) {
        this.map = new (mapConstructor||Map)();
    }

    deleteData(key: TVertex): void {
        this.map.delete(key);
    }

    getData(key: TVertex): TVertexData {
        return this.map.get(key) as TVertexData;
    }

    setData(key: TVertex, data: TVertexData): void {
        this.map.set(key, data);
    }
}

export class GenericManipulable<TVertex> implements ManipulableGraph<TVertex> {
    private forward: Map<TVertex, Set<TVertex>>;
    private backward: Map<TVertex, Set<TVertex>>;
    private vertices: Set<TVertex>;
    private setConstructor: SetConstructor;
    constructor(setConstructor?: SetConstructor, mapConstructor?: MapConstructor) {
        this.forward = new (mapConstructor || Map)();
        this.backward = new (mapConstructor || Map)();
        this.vertices = new (setConstructor || Set)();
        this.setConstructor = setConstructor || Set;
    }

    addEdge(from: TVertex, to: TVertex): void {
        let f = this.forward.get(from);
        let b = this.backward.get(to);
        if (!f) this.forward.set(from, f = new this.setConstructor<TVertex>());
        if (!b) this.backward.set(to, b = new this.setConstructor<TVertex>());
        f.add(to);
        b.add(from);
    }

    addVertex(vertex: TVertex): void {
        this.vertices.add(vertex);
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        const f = this.forward.get(vertex);
        return f ? f.values() : EmptyIterator;
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        const b = this.backward.get(vertex);
        return b ? b.values() : EmptyIterator;
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.forward.get(from);
        return f ? f.has(to) : false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices.has(vertex);
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        let f = this.forward.get(from);
        let b = this.backward.get(to);
        if (f) f.delete(to);
        if (b) b.delete(from);
    }
    deleteVertex(vertex: TVertex): void {
        this.vertices.delete(vertex);
    }
}

class AdapterImpl<TVertex, TVertexData extends VertexData> implements GraphAdapter<TVertex, TVertexData> {
    constructor(
        private associatable: AssociatableGraph<TVertex, TVertexData>,
        private manipulable: ManipulableGraph<TVertex>,
    ) {}

    hasEdge(from: TVertex, to: TVertex): boolean {
        return this.manipulable.hasEdge(from, to);
    }
    hasVertex(vertex: TVertex): boolean {
        return this.manipulable.hasVertex(vertex);
    }
    deleteData(key: TVertex): void {
        this.associatable.deleteData(key);
    }
    getData(key: TVertex): TVertexData {
        return this.associatable.getData(key);
    }
    setData(key: TVertex, data: TVertexData): void {
        this.associatable.setData(key, data);
    }
    addEdge(from: TVertex, to: TVertex): void {
        this.manipulable.addEdge(from, to);
    }
    addVertex(vertex: TVertex): void {
        this.manipulable.addVertex(vertex);
    }
    deleteEdge(from: TVertex, to: TVertex): void {
        this.manipulable.deleteEdge(from, to);
    }
    deleteVertex(vertex: TVertex): void {
        this.manipulable.deleteVertex(vertex);
    }
    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        return this.manipulable.getSuccessorsOf(vertex);
    }
    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        return this.manipulable.getPredecessorsOf(vertex);
    }
}

export class GraphAdapterBuilder<TVertex, TVertexData extends VertexData> implements Builder<GraphAdapter<TVertex, TVertexData>> {
    private associatable?: AssociatableGraph<TVertex, TVertexData>;
    private manipulable?: ManipulableGraph<TVertex>;

    constructor() {
    }

    data(dataStructure: ManipulableGraph<TVertex>): this {
        this.manipulable = dataStructure;
        return this;
    }

    associate(associatable: AssociatableGraph<TVertex, TVertexData>) {
        this.associatable = associatable;
        return this;
    }
    
    build(): GraphAdapter<TVertex, TVertexData> {
        const associatable = this.associatable || new MapAssociator();
        const manipulable = this.manipulable || new GenericManipulable() ;
        return new AdapterImpl(associatable, manipulable);
    }
}