"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function tkMerge(adapter, arr1, arr2) {
    var res = [];
    var len1 = arr1.length;
    var len2 = arr2.length;
    var i1 = 0;
    var i2 = 0;
    while (i1 < len1 && i2 < len2) {
        var o1 = adapter.getData(arr1[i1]);
        var o2 = adapter.getData(arr2[i2]);
        if (o1 < o2) {
            i1 += 1;
            res.push(o1.order);
        }
        else {
            i2 += 1;
            res.push(o2.order);
        }
    }
    while (i1 < len1) {
        var o1 = adapter.getData(arr1[i1]);
        i1 += 1;
        res.push(o1.order);
    }
    while (i2 < len2) {
        var o2 = adapter.getData(arr2[i2]);
        i2 += 1;
        res.push(o2.order);
    }
    return res;
}
var PkImpl = (function () {
    function PkImpl() {
        this.id = 0;
        this.stack = [];
        this.deltaXyB = [];
        this.deltaXyF = [];
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
        this.deltaXyB = [];
        this.deltaXyF = [];
        if (lb < ub) {
            if (!this.dfs_f(y, adapter, ub)) {
                return false;
            }
            this.dfs_b(x, adapter, lb);
            this.reorder(adapter);
        }
        return true;
    };
    PkImpl.prototype.dfs_f = function (first, adapter, ub) {
        this.stack.push(first);
        while (this.stack.length > 0) {
            var n = this.stack.pop();
            adapter.getData(n).visited = true;
            this.deltaXyF.push(n);
            for (var it = adapter.getSuccessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                var wData = adapter.getData(res.value);
                if (wData.order === ub) {
                    return false;
                }
                if (!wData.visited && wData.order < ub) {
                    this.stack.push(res.value);
                }
            }
        }
        return true;
    };
    PkImpl.prototype.dfs_b = function (first, adapter, lb) {
        this.stack.push(first);
        while (this.stack.length > 0) {
            var n = this.stack.pop();
            adapter.getData(n).visited = true;
            this.deltaXyB.push(n);
            for (var it = adapter.getPredecessorsOf(n), res = it.next(); !res.done; res = it.next()) {
                var wData = adapter.getData(res.value);
                if (!wData.visited && lb < wData.order) {
                    this.stack.push(res.value);
                }
            }
        }
    };
    PkImpl.prototype.sort = function (adapter, vertices) {
        for (var i = 0, j = vertices.length; i < j; ++i) {
            vertices[i] = { key: adapter.getData(vertices[i]).order, val: vertices[i] };
        }
        vertices.sort(function (v1, v2) { return v1.key - v2.key; });
        for (var i = 0, j = vertices.length; i < j; ++i) {
            vertices[i] = vertices[i].val;
        }
    };
    PkImpl.prototype.reorder = function (adapter) {
        this.sort(adapter, this.deltaXyB);
        this.sort(adapter, this.deltaXyF);
        var L = this.deltaXyB.concat(this.deltaXyF);
        for (var _i = 0, L_1 = L; _i < L_1.length; _i++) {
            var w = L_1[_i];
            adapter.getData(w).visited = false;
        }
        var R = tkMerge(adapter, this.deltaXyB, this.deltaXyF);
        for (var i = 0, j = L.length; i < j; ++i) {
            adapter.getData(L[i]).order = R[i];
        }
    };
    return PkImpl;
}());
exports.PkImpl = PkImpl;
