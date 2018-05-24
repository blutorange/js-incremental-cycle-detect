Keeps a directed acyclic graph topologically sorted each time you add an edge or vertex.

# Documenation

[Documentation for all methods with examples.](https://blutorange.github.io/js-kagura/)

# Install

The drill:

```sh
npm install --save incremental-topsort
```

Typings for typescript are available.

Use the `dist.js` or `dist.min.js` for browser usage if you must.

Exposes a global object `window.IncrementalTopsort`.

# JavaScript environment

Needs `Set` and `Array#from`. You can either

- use it in an enviroment that support these
- polyfill it
- pass an implementation of Map and Array#from to the factory method. This way you don't have to monkey patch. For example:

```javascript
const IncrementalTopsort = require("incremental-topsort");
IncrementalTopsort.create({
  algorithm: IncrementalTopologicalSortAlgorithm.PK,
  adapter: // ...
  Set: require("core-js/es6/set"),
  ArrayFrom: require("core-js/fn/array/from"),
});
```

# Usage


# Build

Probably not going to work on Windows.

```sh
git clone https://github.com/blutorange/js-kagura
cd js-kagura
npm install
npm run build
```

# Change log

I use the following keywords:

- `Added` A new feature that is backwards-compatible.
- `Changed` A change that is not backwards-compatible.
- `Fixed` A bug or error that was fixed.
