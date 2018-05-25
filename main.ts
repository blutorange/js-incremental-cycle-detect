import { SimpleGraphAdapter } from "./src/GraphAdapter";
import { FactoryOptions, IncrementalTopSortHook } from "./src/Header";
import { HookImpl } from "./src/Hook";
import { PkImpl } from "./src/Pk";

export * from "./src/GraphAdapter";

export function createGraph<TVertex>(opts: FactoryOptions<TVertex> = {}): IncrementalTopSortHook<TVertex> {
    const pkImpl = new PkImpl<TVertex>();
    const adapter = opts.adapter || SimpleGraphAdapter.create();
    const hook = new HookImpl<TVertex>(adapter, pkImpl);
    return hook;
}
