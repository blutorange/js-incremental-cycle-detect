import { CycleDetectorImpl } from "./src/CycleDetector";
import { GenericGraphAdapter } from "./src/GraphAdapter";
import { CycleDetector, FactoryOptions, GraphAdapter } from "./src/Header";
import { PkImpl } from "./src/Pk";

export * from "./src/GraphAdapter";
export * from "./src/Header";

/**
 * This is the main entry point, it creates a new cycle detector.
 * @param opts Additional options for configuring the behaviour of the detector. See {@link FactoryOptions}.
 * @return An object for adding edges and have it report whether that introduces a cycle.
 */
export function createGraph<TVertex>(opts?: FactoryOptions<TVertex, GenericGraphAdapter<TVertex>>): CycleDetector<TVertex, GenericGraphAdapter<TVertex>>;
export function createGraph<TVertex, TGraphAdapter extends GraphAdapter<TVertex>>(opts?: FactoryOptions<TVertex, TGraphAdapter>): CycleDetector<TVertex, TGraphAdapter>;
export function createGraph<TVertex, TGraphAdapter extends GraphAdapter<TVertex>>(opts: FactoryOptions<TVertex, TGraphAdapter> = {}): CycleDetector<TVertex, TGraphAdapter> {
    const pkImpl = new PkImpl<TVertex>();
    const adapter: TGraphAdapter = opts.adapter || (new GenericGraphAdapter<TVertex>() as any as TGraphAdapter);
    const hook = new CycleDetectorImpl<TVertex, TGraphAdapter>(adapter, pkImpl);
    return hook;
}
