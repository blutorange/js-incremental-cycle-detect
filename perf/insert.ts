import { Pair } from "andross";
import * as Benchmark from "benchmark";
import { IStream, TypesafeStreamFactory } from "elbe";
import { Graph, alg } from "graphlib";
import { GenericGraphAdapter, IdVertex, ObjectGraphAdapter } from "../dist/main";
import { GraphlibAdapter, IdGraphAdapter, ObjectVertex } from "../main";

function log(...args: any[]): void {
// tslint:disable-next-line:no-console
console.log(...args);
}

function random() {
return Math.floor(Math.random() * 200);
}

const RandomSource = TypesafeStreamFactory.generate(random).chunk(2) as IStream<Pair<number>>;
const ForwardSource = TypesafeStreamFactory.generate(random).map(i => [i, i + 1] as Pair<number>);
const BackwardSource = TypesafeStreamFactory.generate(random).map(i => [i + 1, i] as Pair<number>);

(global as any).source = [] as number[][];

function mylib_insert(edges: number[][]) {
    const g = new GenericGraphAdapter();
    edges.forEach(([x, y]) => {
        if (x === y || g.hasEdge(x, y)) {
          return;
        }
        g.addEdge(x, y);
    });
}

function mylib_glib_insert(edges: number[][]) {
    const g = new GraphlibAdapter();
    edges.forEach(([x, y]) => {
        if (x === y || g.hasEdge(String(x), String(y))) {
          return;
        }
        g.addEdge(String(x), String(y));
    });
}

function mylib_objgraph_insert(edges: number[][]) {
    const g = new ObjectGraphAdapter();
    const map = new Map<number, ObjectVertex>();
    function get(id: number): ObjectVertex {
        let v = map.get(id);
        if (!v) {
            map.set(id, v = g.createVertex());
        }
        return v;
    }
    edges.forEach(([x, y]) => {
        if (x === y || g.hasEdge(get(x), get(y))) {
          return;
        }
        g.addEdge(get(x), get(y));
    });
}

function mylib_idgraph_insert(edges: number[][]) {
    const g = new IdGraphAdapter();
    const map = new Map<number, IdVertex>();
    function get(id: number): IdVertex {
        let v = map.get(id);
        if (!v) {
            map.set(id, v = g.createVertex());
        }
        return v;
    }
    edges.forEach(([x, y]) => {
        if (x === y || g.hasEdge(get(x), get(y))) {
          return;
        }
        g.addEdge(get(x), get(y));
    });
}

function graphlib_insert(edges: number[][]) {
    const g = new Graph({directed: true});
    edges.forEach(([x, y]) => {
        if (x === y || g.hasEdge(String(x), String(y))) {
            return;
        }
        g.setEdge(String(x), String(y));
        alg.isAcyclic(g);
    });
}

// add tests

function runPerf(n: number, source: IStream<Pair<number>>, details: string = "") {
    (global as any).n = n;
    (global as any).selectedSource = source;
    const setup = () => {
        const count = (global as any).n;
        (global as any).source = (global as any).selectedSource.fork().limit(count).toArray();
    };
    (new Benchmark.Suite())
        .add("incremental-cycle-detection(insert " + n + ", " + details + ")", () => mylib_insert((global as any).source), {setup})
        .add("incremental-cycle-detection-objectgraph(insert " + n + ", " + details + ")", () => mylib_objgraph_insert((global as any).source), {setup})
        .add("incremental-cycle-detection-idgraph(insert " + n + ", " + details + ")", () => mylib_idgraph_insert((global as any).source), {setup})
        .add("incremental-cycle-detection-graphlib(insert " + n + ", " + details + ")", () => mylib_glib_insert((global as any).source), {setup})
        .add("graphlib(insert" + n + ", " + details + ")", () => graphlib_insert((global as any).source), {setup})
        .on("cycle", (event: Benchmark.Event) => {
            log(String(event.target));
        })
        .on("complete", function(this: any) {
            log("Fastest is " + this.filter("fastest").map("name") + "\n");
        })
       .run({ async: false });
}

// tslint:disable-next-line:no-console
console.log("\n\n===Random Source===");
runPerf(20, RandomSource, "_RandomSource");
runPerf(100, RandomSource, "_RandomSource");
runPerf(500, RandomSource, "_RandomSource");

// tslint:disable-next-line:no-console
console.log("\n\n===Forward Source===");
runPerf(20, ForwardSource, "_ForwardSource");
runPerf(100, ForwardSource, "_ForwardSource");
runPerf(500, ForwardSource, "_ForwardSource");

// tslint:disable-next-line:no-console
console.log("\n\n===Backward Source===");
runPerf(20, BackwardSource, "_BackwardSource");
runPerf(100, BackwardSource, "_BackwardSource");
runPerf(500, BackwardSource, "_BackwardSource");
