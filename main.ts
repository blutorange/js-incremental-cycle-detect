import { FactoryOptions, IncrementalTopSortHook, IncrementalTopologicalSortAlgorithm, VertexData } from './src/Header';
import { PkImpl } from './src/Pk';
import { HookImpl } from './src/Hook';
import { GraphAdapterBuilder } from './main';
import { PkVertexData } from './src/PkHeader';

/*
 * Based on the paper
 * A Dynamic Topological Sort Algorithm for Directed Acyclic Graphs
 *   DAVID J. PEARCE / PAUL H. J. KELLY
 *   Journal of Experimental Algorithmics (JEA)
 *   Volume 11, 2006, Article No. 1.7 
 *   ACM New York, NY, USA
 */

export * from "./src/GraphAdapterBuilder";

export function create<TVertex, TVertexData extends VertexData>(opts: FactoryOptions<TVertex> = {}): IncrementalTopSortHook<TVertex, any> {
    opts.algorithm = opts.algorithm || IncrementalTopologicalSortAlgorithm.PK;
    switch (opts.algorithm) {
        case IncrementalTopologicalSortAlgorithm.PK:
        default: {
            const pkImpl = new PkImpl<TVertex>(opts.Set || Set, opts.ArrayFrom || Array.from);
            const adapter = opts.adapter || new GraphAdapterBuilder<TVertex, PkVertexData>().build();
            const hook = new HookImpl<TVertex, PkVertexData>(adapter, pkImpl);
            return hook;
        }
    }
}