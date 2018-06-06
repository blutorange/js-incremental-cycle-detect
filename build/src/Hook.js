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
        if (!this.adapter.hasVertex(from)) {
            this.addVertex(from);
        }
        if (!this.adapter.hasVertex(to)) {
            this.addVertex(to);
        }
        if (this.adapter.hasEdge(from, to)) {
            return true;
        }
        if (!this.algo.addEdge(this.adapter, from, to)) {
            return false;
        }
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
    return HookImpl;
}());
exports.HookImpl = HookImpl;
