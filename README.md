Utility methods for creating comparators, ie. `function (left,right)=>number`. Slightly more versatile than other packages I found.

* ~ 700 bytes minified + gzipped without browser polyfills etc.

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

Compare objects by their `id` property:

```javascript
// import this lib
const { byKey } = require("kagura")

// create array and sort it with a custom comparator
const array = [ {id: 6}, {id: 3} ]

array.sort(byKey(item => item.id));
```

If you are comparing simply by some property, you can also use `byProp`:

```javascript
const { byProp } = require("kagura")
array.sort(byProp("id"))
```

Compare objects by their `data.id` property in descending order:

```javascript
byProp("data.id", inverse) // preferred

// equivalently you couse use
invert(byProp("data.id"))
byKey(item => - item.data.id)
byKey(item => item.data.id, inverse)
```

Compare objects by their `lastName` property first, then `firstName`, then `age`.

```javascript
combine(
  byProp("lastName"),
  byProp("firstName"),
  byProp("age")
)
```

Find all items equal to "cake".

```javascript
["cake", "chocolate"].filter(equalTo("cake"))

["cake", "Cake", "chocolate"].filter(equalTo("cake"), ignoreCase)

[{name: "cake"}, {name: "chocolate"}]
  .filter(equalTo("cake", byKey("name")))

[{name: "cake"}, {name: "Cake"}, {name: "chocolate"}]
  .filter(equalTo("cake", byKey("name", ignoreCase)))
```

Compare objects by using the comparison operator > and <.

```javascript
[9,7,8].sort(natural) // => [7,8,9]
[9,7,8].sort(inverse) // => [9,8,7]
```

# Handling undefined

## Sort order of undefined

`undefined` always compares as less than any other value. This is different than how
Array#sort handles `undefined`, but in line with the idea that an undefined `string` represents a blank string, which sorts before other strings alphabetically. This
behaviour is also useful when working with comparisons on multiple properties.

To illustrate this, consider the following list of users, sorted first by their given
name, then by their family name.

```javascript
const user1 = {given: "dave", family: "oxford"};
const user2 = {given: "dave", family: "carbide"};
const user3 = {given: "laura", family: "oxford"};
const user4 = {given: "laura", family: "borea"};
const user5 = {given: "odo", family: "frodo"};
const users = [user1, user2, user3, user4, user5];
const comparator = combine(byProp("given"), byProp("family"));
users.sort(comparator);
// => [user2, user1, user4, user3, user5]
```

Now assume we want to get all users whose given name is `laura`. We could iterate
over all entries and apply a filter:

```javascript
users.filter(user => user.given === "laura");
``` 

This works, but this takes `O(n)` time to run. Assuming the list is already
sorted, a binary search runs in `O(log(n))` time. We construct a virtual user
object with only a given name `{given: "laura"}` and determine the position
where it would sort in the ordered list.

```javascript
const search = {given: "laura"};
const start = users.findIndex(user => comparator(search, user) <= 0);
// start === 2  
```

Since `undefined` sorts before any other value, the start position now points
to the first user in the sorted list with a given name of `laura`. Now we can
find all `laura`s by iterating from the start position until we encounter a user
with a different given name.

```javascript
for (let user = users[start]; user.given === `laura`; user= users[++start]) {
  // do something with the user
  console.log(user);
}
// => logs user4 and user3
```

This approach also works well with binary search trees that always keep
their elements sorted.

## Sorting arrays

The built-in array sort method always sorts `undefined` last, irrespective of the given comparator. Use one of the wrapper methods
to sort `undefined` properly:

```javascript
const { sort } = require("kagura");

// Comparator "natural" sorts undefind before any other value.
// But the built-in function always puts undefined last.
[1,2,undefined,3].sort(natural);
// => [1,2,3,undefined]

sort([1,2,undefined,3], natural)
// => [undefined, 1, 2, 3]
```

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

## 1.2.0

- Added sort wrappers, [see above](#sorting-arrays).
- Fixed some typings regarding `undefined`. Some methods can handle undefined by setting the type parameter to `T|undefined` on the calling side.

## 1.1.0

- Updated all methods to handle `undefined` values. [See above](#handling-undefined)
  for details.
- Extracted common interfaces and types (Comparator, Predicate etc.) to
  [their own package](https://npmjs.com/package/andross). This affects you only if
  you are using typescript and are referring to these types explicitly; in this case
  please import them from the package `andross` instead from this package `kagura`, see
  below.

```typescript
// If using typescript, change this
import { Comparable, Comparator, Equator, KeyExtractor, Predicate } from "kagura";
// to
import { Comparable, Comparator, Equator, KeyExtractor, Predicate } from "andross";
```

# Teh name

[Senran Kagura](http://en.wikipedia.org/wiki/Senran_Kagura). Which part of the human body are they always concerned with and keep comparing?
