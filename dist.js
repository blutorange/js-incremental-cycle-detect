(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.IncrementalTopsort = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Header_1 = require("./src/Header");
var Pk_1 = require("./src/Pk");
var Hook_1 = require("./src/Hook");
var main_1 = require("./main");
tslib_1.__exportStar(require("./src/GraphAdapterBuilder"), exports);
function create(opts) {
    if (opts === void 0) { opts = {}; }
    opts.algorithm = opts.algorithm || Header_1.IncrementalTopologicalSortAlgorithm.PK;
    switch (opts.algorithm) {
        case Header_1.IncrementalTopologicalSortAlgorithm.PK:
        default: {
            var pkImpl = new Pk_1.PkImpl(opts.Set || Set, opts.ArrayFrom || Array.from);
            var adapter = opts.adapter || new main_1.GraphAdapterBuilder().build();
            var hook = new Hook_1.HookImpl(adapter, pkImpl);
            return hook;
        }
    }
}
exports.create = create;

},{"./main":1,"./src/GraphAdapterBuilder":2,"./src/Header":3,"./src/Hook":4,"./src/Pk":5,"tslib":6}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DoneIteratorResult = {
    done: true,
    value: undefined,
};
var EmptyIterator = {
    next: function () {
        return DoneIteratorResult;
    }
};
var MapAssociator = (function () {
    function MapAssociator(mapConstructor) {
        this.map = new (mapConstructor || Map)();
    }
    MapAssociator.prototype.deleteData = function (key) {
        this.map.delete(key);
    };
    MapAssociator.prototype.getData = function (key) {
        return this.map.get(key);
    };
    MapAssociator.prototype.setData = function (key, data) {
        this.map.set(key, data);
    };
    return MapAssociator;
}());
exports.MapAssociator = MapAssociator;
var GenericManipulable = (function () {
    function GenericManipulable(setConstructor, mapConstructor) {
        this.forward = new (mapConstructor || Map)();
        this.backward = new (mapConstructor || Map)();
        this.vertices = new (setConstructor || Set)();
        this.setConstructor = setConstructor || Set;
    }
    GenericManipulable.prototype.addEdge = function (from, to) {
        var f = this.forward.get(from);
        var b = this.backward.get(to);
        if (!f)
            this.forward.set(from, f = new this.setConstructor());
        if (!b)
            this.backward.set(to, b = new this.setConstructor());
        f.add(to);
        b.add(from);
    };
    GenericManipulable.prototype.addVertex = function (vertex) {
        this.vertices.add(vertex);
    };
    GenericManipulable.prototype.getSuccessorsOf = function (vertex) {
        var f = this.forward.get(vertex);
        return f ? f.values() : EmptyIterator;
    };
    GenericManipulable.prototype.getPredecessorsOf = function (vertex) {
        var b = this.backward.get(vertex);
        return b ? b.values() : EmptyIterator;
    };
    GenericManipulable.prototype.hasEdge = function (from, to) {
        var f = this.forward.get(from);
        return f ? f.has(to) : false;
    };
    GenericManipulable.prototype.hasVertex = function (vertex) {
        return this.vertices.has(vertex);
    };
    GenericManipulable.prototype.deleteEdge = function (from, to) {
        var f = this.forward.get(from);
        var b = this.backward.get(to);
        if (f)
            f.delete(to);
        if (b)
            b.delete(from);
    };
    GenericManipulable.prototype.deleteVertex = function (vertex) {
        this.vertices.delete(vertex);
    };
    return GenericManipulable;
}());
exports.GenericManipulable = GenericManipulable;
var AdapterImpl = (function () {
    function AdapterImpl(associatable, manipulable) {
        this.associatable = associatable;
        this.manipulable = manipulable;
    }
    AdapterImpl.prototype.hasEdge = function (from, to) {
        return this.manipulable.hasEdge(from, to);
    };
    AdapterImpl.prototype.hasVertex = function (vertex) {
        return this.manipulable.hasVertex(vertex);
    };
    AdapterImpl.prototype.deleteData = function (key) {
        this.associatable.deleteData(key);
    };
    AdapterImpl.prototype.getData = function (key) {
        return this.associatable.getData(key);
    };
    AdapterImpl.prototype.setData = function (key, data) {
        this.associatable.setData(key, data);
    };
    AdapterImpl.prototype.addEdge = function (from, to) {
        this.manipulable.addEdge(from, to);
    };
    AdapterImpl.prototype.addVertex = function (vertex) {
        this.manipulable.addVertex(vertex);
    };
    AdapterImpl.prototype.deleteEdge = function (from, to) {
        this.manipulable.deleteEdge(from, to);
    };
    AdapterImpl.prototype.deleteVertex = function (vertex) {
        this.manipulable.deleteVertex(vertex);
    };
    AdapterImpl.prototype.getSuccessorsOf = function (vertex) {
        return this.manipulable.getSuccessorsOf(vertex);
    };
    AdapterImpl.prototype.getPredecessorsOf = function (vertex) {
        return this.manipulable.getPredecessorsOf(vertex);
    };
    return AdapterImpl;
}());
var GraphAdapterBuilder = (function () {
    function GraphAdapterBuilder() {
    }
    GraphAdapterBuilder.prototype.data = function (dataStructure) {
        this.manipulable = dataStructure;
        return this;
    };
    GraphAdapterBuilder.prototype.associate = function (associatable) {
        this.associatable = associatable;
        return this;
    };
    GraphAdapterBuilder.prototype.build = function () {
        var associatable = this.associatable || new MapAssociator();
        var manipulable = this.manipulable || new GenericManipulable();
        return new AdapterImpl(associatable, manipulable);
    };
    return GraphAdapterBuilder;
}());
exports.GraphAdapterBuilder = GraphAdapterBuilder;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IncrementalTopologicalSortAlgorithm;
(function (IncrementalTopologicalSortAlgorithm) {
    IncrementalTopologicalSortAlgorithm[IncrementalTopologicalSortAlgorithm["PK"] = 0] = "PK";
})(IncrementalTopologicalSortAlgorithm = exports.IncrementalTopologicalSortAlgorithm || (exports.IncrementalTopologicalSortAlgorithm = {}));

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HookImpl = (function () {
    function HookImpl(adapter, algo) {
        this.adapter = adapter;
        this.algo = algo;
    }
    HookImpl.prototype.addVertex = function (vertex) {
        var data = this.algo.createVertex(this.adapter, vertex);
        this.adapter.addVertex(vertex);
        this.adapter.setData(vertex, data);
    };
    HookImpl.prototype.addEdge = function (from, to) {
        if (!this.adapter.hasVertex(from))
            this.addVertex(from);
        if (!this.adapter.hasVertex(to))
            this.addVertex(to);
        if (this.adapter.hasEdge(from, to))
            return true;
        if (!this.algo.addEdge(this.adapter, from, to))
            return false;
        this.adapter.addEdge(from, to);
        return true;
    };
    HookImpl.prototype.deleteEdge = function (from, to) {
        this.algo.deleteEdge(from, to);
        this.adapter.deleteEdge(from, to);
    };
    HookImpl.prototype.deleteVertex = function (vertex) {
        this.adapter.deleteData(vertex);
        this.algo.deleteVertex(this.adapter, vertex);
        this.adapter.deleteVertex(vertex);
    };
    HookImpl.prototype.unwrap = function () {
        return this.adapter;
    };
    return HookImpl;
}());
exports.HookImpl = HookImpl;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function tkMerge(arr1, arr2) {
    var res = [];
    var len1 = arr1.length;
    var len2 = arr2.length;
    var i1 = 0;
    var i2 = 0;
    while (i1 < len1 && i2 < len2) {
        if (arr1[i1] < arr2[i2])
            res.push(arr1[i1++].key);
        else
            res.push(arr2[i2++].key);
    }
    while (i1 < len1)
        res.push(arr1[i1++].key);
    while (i2 < len2)
        res.push(arr2[i2++].key);
    return res;
}
var PkImpl = (function () {
    function PkImpl(setConstructor, arrayFrom) {
        this.setConstructor = setConstructor;
        this.arrayFrom = arrayFrom;
        this.id = 0;
    }
    PkImpl.prototype.createVertex = function (adapter, vertex) {
        var id = this.id++;
        return {
            order: id,
            visited: false,
        };
    };
    PkImpl.prototype.deleteEdge = function (from, to) {
    };
    PkImpl.prototype.deleteVertex = function (adapter, vertex) {
    };
    PkImpl.prototype.addEdge = function (adapter, x, y) {
        var lb = adapter.getData(y).order;
        var ub = adapter.getData(x).order;
        var delta_xy_b = new this.setConstructor();
        var delta_xy_f = new this.setConstructor();
        if (lb < ub) {
            if (!this.dfs_f(y, adapter, ub, delta_xy_f))
                return false;
            this.dfs_b(x, adapter, lb, delta_xy_b);
            this.reorder(delta_xy_f, delta_xy_b, adapter);
        }
        return true;
    };
    PkImpl.prototype.dfs_f = function (first, adapter, ub, delta_xy_f) {
        var stack = [first];
        while (stack.length > 0) {
            var n = stack.pop();
            adapter.getData(n).visited = true;
            delta_xy_f.add(n);
            for (var it = adapter.getSuccessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                var w_data = adapter.getData(res.value);
                if (w_data.order === ub) {
                    return false;
                }
                if (!w_data.visited && w_data.order < ub) {
                    stack.push(res.value);
                }
            }
            ;
        }
        return true;
    };
    PkImpl.prototype.dfs_b = function (first, adapter, lb, delta_xy_b) {
        var stack = [first];
        while (stack.length > 0) {
            var n = stack.pop();
            adapter.getData(n).visited = true;
            delta_xy_b.add(n);
            for (var it = adapter.getPredecessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                var w_data = adapter.getData(res.value);
                if (!w_data.visited && lb < w_data.order) {
                    stack.push(res.value);
                }
            }
            ;
        }
    };
    PkImpl.prototype.sort = function (adapter, set) {
        return this.arrayFrom(set, function (vertex) { return ({
            key: adapter.getData(vertex).order,
            value: vertex,
        }); }).sort(function (v1, v2) { return v1.key - v2.key; });
    };
    PkImpl.prototype.load = function (adapter, array, L) {
        for (var i = 0, j = array.length; i < j; ++i) {
            var w = array[i].value;
            var w_data = adapter.getData(w);
            array[i].key = w_data.order;
            w_data.visited = false;
            L.push(w);
        }
    };
    PkImpl.prototype.reorder = function (delta_xy_f, delta_xy_b, adapter) {
        var array_delta_xy_f = this.sort(adapter, delta_xy_f);
        var array_delta_xy_b = this.sort(adapter, delta_xy_b);
        var L = [];
        this.load(adapter, array_delta_xy_b, L);
        this.load(adapter, array_delta_xy_f, L);
        var R = tkMerge(array_delta_xy_b, array_delta_xy_f);
        for (var i = 0, j = L.length; i < j; ++i) {
            adapter.getData(L[i]).order = R[i];
        }
    };
    return PkImpl;
}());
exports.PkImpl = PkImpl;

},{}],6:[function(require,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
                t[p[i]] = s[p[i]];
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [0, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});
