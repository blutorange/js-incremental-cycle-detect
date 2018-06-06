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
        if (!f) {
            this.forward.set(from, f = new this.setConstructor());
        }
        if (!b) {
            this.backward.set(to, b = new this.setConstructor());
        }
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
        if (f) {
            f.delete(to);
        }
        if (b) {
            b.delete(from);
        }
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
