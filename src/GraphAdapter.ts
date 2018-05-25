import { AssociatableGraph, GraphAdapter, ManipulableGraph } from "./Header";
import { PkVertexData } from "./PkHeader";

export type Without<T, K> = Pick<T, Exclude<keyof T, keyof K>>;

const DoneIteratorResult: IteratorResult<any> = {
    done: true,
    value: undefined,
};

const EmptyIterator: Iterator<any> = {
    next() {
        return DoneIteratorResult;
    }
};

function ensureSize(arr: any[], minSize: number): void {
    if (minSize < arr.length) {
        return;
    }
    const newSize = Math.min(4, arr.length * 2);
    for (minSize = newSize - arr.length; minSize -- > 0;) {
        arr.push(undefined);
    }
}

function createArrayIterator<T>(arr: (T|undefined)[]): Iterator<T> {
    let i = 0;
    return {
        next(): IteratorResult<T> {
            while (arr[i] === undefined) {
                if (i > arr.length) {
                    return DoneIteratorResult;
                }
                i +=  1;
            }
            return {
                done: false,
                value: arr[i++] as T,
            };
        }
    };
}

function createUndefinedArray(len: number): undefined[] {
    const arr = [];
    while (len -- > 0) {
        arr.push(undefined);
    }
    return arr;
}

export class MapAssociator<TVertex> implements AssociatableGraph<TVertex> {
    private map: Map<TVertex, PkVertexData>;

    constructor(mapConstructor?: MapConstructor) {
        this.map = new (mapConstructor || Map)();
    }

    deleteData(key: TVertex): void {
        this.map.delete(key);
    }

    getData(key: TVertex): PkVertexData {
        return this.map.get(key) as PkVertexData;
    }

    setData(key: TVertex, data: PkVertexData): void {
        this.map.set(key, data);
    }
}

export interface IdVertex<TVertex extends IdVertex<TVertex> = IdVertex<TVertex>> {
    /** Id of this vertex. */
    id: number;
    /** Set of immediate successors of this vertex. */
    next: (TVertex|undefined)[];
    /** Set of immediate predecessors of this vertex. */
    prev: (TVertex|undefined)[];
    data?: PkVertexData;
}

/**
 * Graph adapter for vertices with small integer ID used to store the vertices in arrays.
 *
 * ```
 * graph = [
 *   {
 *     id: 0,
 *     data: {} // custom data used by the algorithm
 *     next: [undefined, {id: 1, ...circular}, undefined],
 *     prev: [undefined, undefined, {id: 2, ...circular}]
 *   },
 *   {
 *      id: 1,
 *      data: {},
 *      next: [],
 *      prev: [{id: 0, ...circular}]
 *   },
 *   {
 *      id: 2,
 *      data: {},
 *      next: [],
 *      prev: [{id: 0, ...circular}]
 *   },
 *   ...
 * ]
 * ```
 */
export class IdGraphAdapter<TVertex extends IdVertex<TVertex>> implements ManipulableGraph<TVertex>, AssociatableGraph<TVertex> {
    private vertices: (TVertex|undefined)[];
    private id: number;

    constructor() {
        this.vertices = [];
        this.id = 0;
    }

    deleteData(key: TVertex): void {
        key.data = undefined;
    }

    getData(key: TVertex): PkVertexData {
        return key.data as PkVertexData;
    }

    setData(key: TVertex, data: PkVertexData): void {
        key.data = data;
    }

    createVertex(additionalData: Without<TVertex, IdVertex<TVertex>>): TVertex {
        const base = {
            id: this.id++,
            next: createUndefinedArray(this.vertices.length),
            prev: createUndefinedArray(this.vertices.length),
        };
        return Object.assign(base, additionalData) as TVertex;
    }

    addEdge(from: TVertex, to: TVertex): void {
        const f = this.vertices[from.id];
        const b = this.vertices[to.id];
        if (f) {
            ensureSize(f.next, to.id);
            f.next[to.id] = to;
        }
        if (b) {
            ensureSize(b.prev, from.id);
            b.prev[from.id] = from;
        }
    }

    addVertex(vertex: TVertex): void {
        ensureSize(this.vertices, vertex.id);
        this.vertices[vertex.id] = vertex;
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        const f = this.vertices[from.id];
        const b = this.vertices[to.id];
        if (f) {
            f.next[to.id] = undefined;
        }
        if (b) {
            b.prev[from.id] = undefined;
        }

    }

    deleteVertex(vertex: TVertex): void {
        this.vertices[vertex.id] = undefined;
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        return createArrayIterator(vertex.next);
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        return createArrayIterator(vertex.prev);
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        const f = this.vertices[from.id];
        if (f) {
            return f.next[to.id] !== undefined;
        }
        return false;
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices[vertex.id] !== undefined;
    }
}

export interface ObjectVertex<TVertex extends ObjectVertex<TVertex>> {
    /** Set of immediate successors of this vertex. */
    next: Set<TVertex>;
    /** Set of immediate predecessors of this vertex. */
    prev: Set<TVertex>;
    data?: PkVertexData;
}

/**
 * A graph adapter for an adjacency data structure with vertices represented as objects:
 *
 * ```
 * graph = Set<
 *      {
 *          data: {} // custom data used by the algorithm
 *          next: Set // immediate successors
 *          prev: Set // immediate predeccesors
 *      }
 * >
 * ```
 */
export class ObjectGraphAdapter<TVertex extends ObjectVertex<TVertex>> implements ManipulableGraph<TVertex>, AssociatableGraph<TVertex> {
    private setConstructor: SetConstructor;
    private vertices: Set<TVertex>;

    constructor(setConstructor?: SetConstructor) {
        this.setConstructor = setConstructor || Set;
        this.vertices = new this.setConstructor();
    }

    deleteData(key: TVertex): void {
        key.data = undefined;
    }

    getData(key: TVertex): PkVertexData {
        return key.data as PkVertexData;
    }

    setData(key: TVertex, data: PkVertexData): void {
        key.data = data;
    }

    addEdge(from: TVertex, to: TVertex): void {
        from.next.add(to);
        to.prev.add(from);
    }

    createVertex(additionalData: Without<TVertex, ObjectVertex<TVertex>>): TVertex {
        const base = {
            next: new this.setConstructor<TVertex>(),
            prev: new this.setConstructor<TVertex>(),
        };
        return Object.assign(base, additionalData) as TVertex;
    }

    addVertex(vertex: TVertex): void {
        this.vertices.add(vertex);
    }

    deleteEdge(from: TVertex, to: TVertex): void {
        from.next.delete(from);
        to.prev.delete(from);
    }

    deleteVertex(vertex: TVertex): void {
        this.vertices.delete(vertex);
    }

    getSuccessorsOf(vertex: TVertex): Iterator<TVertex> {
        return vertex.next.values();
    }

    getPredecessorsOf(vertex: TVertex): Iterator<TVertex> {
        return vertex.prev.values();
    }

    hasEdge(from: TVertex, to: TVertex): boolean {
        return from.next.has(to);
    }

    hasVertex(vertex: TVertex): boolean {
        return this.vertices.has(vertex);
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
        if (!f) {
            this.forward.set(from, f = new this.setConstructor<TVertex>());
        }
        if (!b) {
            this.backward.set(to, b = new this.setConstructor<TVertex>());
        }
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
        const f = this.forward.get(from);
        const b = this.backward.get(to);
        if (f) {
            f.delete(to);
        }
        if (b) {
            b.delete(from);
        }
    }
    deleteVertex(vertex: TVertex): void {
        this.vertices.delete(vertex);
    }
}

export class SimpleGraphAdapter<TVertex> implements GraphAdapter<TVertex> {
    static create<TVertex>(dataStructure?: ManipulableGraph<TVertex>, associatable?: AssociatableGraph<TVertex>) {
        associatable = associatable || new MapAssociator();
        dataStructure = dataStructure || new GenericManipulable() ;
        return new SimpleGraphAdapter(dataStructure, associatable);
    }

    private constructor(
        private manipulable: ManipulableGraph<TVertex>,
        private associatable: AssociatableGraph<TVertex>,
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
    getData(key: TVertex): PkVertexData {
        return this.associatable.getData(key);
    }
    setData(key: TVertex, data: PkVertexData): void {
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
