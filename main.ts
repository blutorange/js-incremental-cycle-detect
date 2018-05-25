import { GraphAdapterBuilder } from "./src/GraphAdapterBuilder";
import { FactoryOptions, IncrementalTopSortHook, IncrementalTopologicalSortAlgorithm } from "./src/Header";
import { HookImpl } from "./src/Hook";
import { PkImpl } from "./src/Pk";
import { PkVertexData } from "./src/PkHeader";

/*
 * Based on the paper
 * A Dynamic Topological Sort Algorithm for Directed Acyclic Graphs
 *   DAVID J. PEARCE / PAUL H. J. KELLY
 *   Journal of Experimental Algorithmics (JEA)
 *   Volume 11, 2006, Article No. 1.7
 *   ACM New York, NY, USA
 */

export * from "./src/GraphAdapterBuilder";

export function create<TVertex>(opts: FactoryOptions<TVertex> = {}): IncrementalTopSortHook<TVertex, any> {
    opts.algorithm = opts.algorithm || IncrementalTopologicalSortAlgorithm.PK;
    switch (opts.algorithm) {
        case IncrementalTopologicalSortAlgorithm.PK:
        default: {
            const pkImpl = new PkImpl<TVertex>();
            const adapter = opts.adapter || new GraphAdapterBuilder<TVertex, PkVertexData>().build();
            const hook = new HookImpl<TVertex, PkVertexData>(adapter, pkImpl);
            return hook;
        }
    }
}
