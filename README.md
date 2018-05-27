Lets you add edges to a [directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph) and be told whether this edge
introduces a [cycle](https://en.wikipedia.org/wiki/Cycle_(graph_theory)). If it would, it is not added. Useful when trying to build
an acyclic graph.

Based on [the paper](https://dl.acm.org/citation.cfm?id=1210590):

```
A Dynamic Topological Sort Algorithm for Directed Acyclic Graphs
   DAVID J. PEARCE / PAUL H. J. KELLY
   Journal of Experimental Algorithmics (JEA)
   Volume 11, 2006, Article No. 1.7
   ACM New York, NY, USA
```

# Documenation

[Documentation for all methods with examples.](https://blutorange.github.io/js-incremental-topsort/)

# Install

The [drill](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
npm install --save incremental-cycle-detect
```

Typings for [Typescript](https://www.typescriptlang.org/) are available (this is written in typescript!).

Use the `dist.js` or `dist.min.js` for [browser usage](http://browserify.org/) if you must.

Exposes a [global object](https://softwareengineering.stackexchange.com/questions/277279/why-are-globals-bad-in-javascript) `window.IncrementalCycleDetect` with the same methods you can when importing this lib:

```javascript
import * as IncrementalCycleDetect from "incremental-cycle-detect";
```

# Performance

This is faster if many edges need to be added. Tests done with `benchmark`.
compared with running a full topological sort with `js-graph-algorithms`.
Measured times is the time that was needed for creating an new graph and addng `n`, checking
for a cycle after each edge insertion.

```
    incremental-cycle-detection#insert_20_RandomSource x 14,420 ops/sec ±8.23% (66 runs sampled)
    graphlib#insert_20_RandomSource x 1,560 ops/sec ±0.58% (95 runs sampled)
    Fastest is incremental-cycle-detection#insert_20_RandomSource

    incremental-cycle-detection#insert_100_RandomSource x 3,702 ops/sec ±7.57% (58 runs sampled)
    graphlib#insert_100_RandomSource x 91.95 ops/sec ±1.97% (78 runs sampled)
    Fastest is incremental-cycle-detection#insert_100_RandomSource

    incremental-cycle-detection#insert_500_RandomSource x 819 ops/sec ±5.45% (83 runs sampled)
    graphlib#insert_500_RandomSource x 19.61 ops/sec ±3.52% (37 runs sampled)
    Fastest is incremental-cycle-detection#insert_500_RandomSource

    incremental-cycle-detection#insert_20_ForwardSource x 16,564 ops/sec ±7.22% (56 runs sampled)
    graphlib#insert_20_ForwardSource x 1,444 ops/sec ±0.64% (92 runs sampled)
    Fastest is incremental-cycle-detection#insert_20_ForwardSource

    incremental-cycle-detection#insert_100_ForwardSource x 4,107 ops/sec ±7.31% (55 runs sampled)
    graphlib#insert_100_ForwardSource x 127 ops/sec ±0.28% (81 runs sampled)
    Fastest is incremental-cycle-detection#insert_100_ForwardSource

    incremental-cycle-detection#insert_500_ForwardSource x 1,924 ops/sec ±6.87% (59 runs sampled)
    graphlib#insert_500_ForwardSource x 30.86 ops/sec ±3.55% (54 runs sampled)
    Fastest is incremental-cycle-detection#insert_500_ForwardSource

    incremental-cycle-detection#insert_20_BackwardSource x 18,044 ops/sec ±7.65% (64 runs sampled)
    graphlib#insert_20BackwardSource x 1,480 ops/sec ±1.02% (92 runs sampled)
    Fastest is incremental-cycle-detection#insert_20_BackwardSource

    incremental-cycle-detection#insert_100_BackwardSource x 5,226 ops/sec ±7.41% (53 runs sampled)
    graphlib#insert_100BackwardSource x 133 ops/sec ±0.59% (83 runs sampled)
    Fastest is incremental-cycle-detection#insert_100_BackwardSource

    incremental-cycle-detection#insert_500_BackwardSource x 1,926 ops/sec ±6.66% (58 runs sampled)
    graphlib#insert_500BackwardSource x 29.80 ops/sec ±0.48% (52 runs sampled)
    Fastest is incremental-cycle-detection#insert_500_BackwardSource
```

# JavaScript environment

Some parts need `Map` and `Set`. You can either

- use this lib in an enviroment that [supports these](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [polyfill](https://en.wikipedia.org/wiki/Polyfill_(programming)) Map/Set
- pass an implementation of Map/Set to the constructor or factory method. This way you don't have to [monkey patch](https://stackoverflow.com/questions/5741877/is-monkey-patching-really-that-bad).

# Usage

TODO

# Build

May not to work on [Windows](https://xkcd.com/196/).

```sh
git clone https://github.com/blutorange/js-incremental-cycle-detect
cd js-incremental-cycle-detection
npm install
npm run build
```

# Change log

I use the following keywords:

- `Added` A new feature that is backwards-compatible.
- `Changed` A change that is not backwards-compatible.
- `Fixed` A bug or error that was fixed.

From newest to oldest:

- 0.1.0 Initial version.