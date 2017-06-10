"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
function bisect(array, e, cmp, l, r) {
    if (l === void 0) { l = 0; }
    if (r === void 0) { r = array.length; }
    var mid;
    var c;
    while (l < r) {
        mid = l + r >>> 1;
        c = cmp(e, array[mid]);
        if (c > 0) {
            l = mid + 1;
        }
        else {
            r = mid;
        }
    }
    return l;
}
exports.bisect = bisect;
function arrayCmp(a, b) {
    for (var i = 0; i < a.length && i < b.length; ++i) {
        var aVal = a[i];
        var bVal = b[i];
        if (aVal === bVal)
            continue;
        if (bVal === Infinity)
            return -1;
        if (aVal === Infinity)
            return 1;
        if (aVal == null)
            return -1;
        if (bVal == null)
            return 1;
        if (aVal < bVal)
            return -1;
        return 1;
    }
    if (a.length === b.length)
        return 0;
    if (a.length > b.length)
        return 1;
    return -1;
}
exports.arrayCmp = arrayCmp;
function numberCmp(a, b) {
    return a - b;
}
exports.numberCmp = numberCmp;
function cmpKeyToEntry(a, b) {
    return arrayCmp(a, b[0]);
}
var Indexer = (function () {
    function Indexer(mainIndexName) {
        this.mainIndexName = mainIndexName;
        this.indexKeyers = {};
        this.indexDependentGroup = {};
        this.indexGroupKeyers = {};
        this.indexReducers = {};
        this.indexes = [];
    }
    Indexer.prototype.addIndex = function (attr, keyer) {
        if (attr in this.indexKeyers) {
            throw new Error("duplicate definition for index " + attr);
        }
        this.indexKeyers[attr] = keyer;
        this.indexes.push(attr);
    };
    Indexer.prototype.addGroupedIndex = function (attr, keyer, groupAttr, groupKeyer, reducer) {
        if (!this.indexKeyers[groupAttr]) {
            throw new Error("Dependent index " + groupAttr + " should be defined before " + attr);
        }
        this.addIndex(attr, keyer);
        this.indexDependentGroup[attr] = groupAttr;
        this.indexGroupKeyers[attr] = groupKeyer;
        this.indexReducers[attr] = reducer;
    };
    Indexer.prototype.matchesInitialState = function (initialState) {
        return this._empty === initialState;
    };
    Indexer.prototype.empty = function () {
        if (this._empty)
            return this._empty;
        var result = this._empty = {};
        for (var k in this.indexKeyers) {
            result[k] = [];
        }
        return result;
    };
    Indexer.prototype.removeAll = function (indexes, values) {
        return this.splice(indexes, values, []);
    };
    Indexer.prototype.removeByPk = function (indexes, primaryKey) {
        return this.removeAll(indexes, Indexer.getAllMatching(indexes[this.mainIndexName], primaryKey));
    };
    Indexer.prototype.update = function (indexes, values) {
        var _this = this;
        var oldValues = [];
        var newValues = [];
        var uniqueValues = uniqueIndex(this.indexKeyers[this.mainIndexName], values);
        uniqueValues.forEach(function (v) {
            var existing = _this.getByPk(indexes, v[0]);
            if (existing)
                oldValues.push(existing);
            newValues.push(v[1]);
        });
        return this.splice(indexes, oldValues, newValues);
    };
    Indexer.iterator = function (index, startKey, endKey) {
        if (startKey === void 0) { startKey = null; }
        if (endKey === void 0) { endKey = null; }
        var _a = Indexer.getRangeFrom(index, startKey, endKey), startIdx = _a.startIdx, endIdx = _a.endIdx;
        var idx = startIdx;
        return function () {
            if (idx < endIdx) {
                return index[idx++][1];
            }
            return null;
        };
    };
    Indexer.reverseIter = function (index, startKey, endKey) {
        if (startKey === void 0) { startKey = null; }
        if (endKey === void 0) { endKey = null; }
        if (startKey)
            startKey = startKey.concat([undefined]);
        if (endKey)
            endKey = endKey.concat([undefined]);
        var _a = Indexer.getRangeFrom(index, endKey, startKey), startIdx = _a.startIdx, endIdx = _a.endIdx;
        var idx = endIdx;
        return function () {
            if (idx > startIdx) {
                return index[--idx][1];
            }
            return null;
        };
    };
    Indexer.getAllMatching = function (index, key) {
        var _a = Indexer.getRangeFrom(index, key, key.concat([Infinity])), startIdx = _a.startIdx, endIdx = _a.endIdx;
        return index.slice(startIdx, endIdx).map(function (_a) {
            var _ = _a[0], value = _a[1];
            return value;
        });
    };
    Indexer.prototype.getByPk = function (indexes, key) {
        return Indexer.getFirstMatching(indexes[this.mainIndexName], key);
    };
    Indexer.getRangeFrom = function (index, startKey, endKey) {
        if (startKey === void 0) { startKey = null; }
        if (endKey === void 0) { endKey = null; }
        var startIdx;
        var endIdx;
        if (startKey == null) {
            startIdx = 0;
        }
        else {
            startIdx = bisect(index, startKey, cmpKeyToEntry);
        }
        if (endKey == null) {
            endIdx = index.length;
        }
        else {
            endIdx = bisect(index, endKey, cmpKeyToEntry);
        }
        return { startIdx: startIdx, endIdx: endIdx };
    };
    Indexer.getFirstMatching = function (index, key) {
        var iter = Indexer.iterator(index, key, key.concat([Infinity]));
        return iter();
    };
    Indexer.prototype.splice = function (indexes, removeValues, addValues) {
        var oldIndexes = indexes;
        if (!removeValues.length && !addValues.length) {
            return indexes;
        }
        indexes = __assign({}, indexes);
        for (var _i = 0, _a = this.indexes; _i < _a.length; _i++) {
            var indexName = _a[_i];
            var index = indexes[indexName];
            var valuesToRemove = removeValues;
            var valuesToAdd = addValues;
            var groupIndexName = this.indexDependentGroup[indexName];
            if (groupIndexName) {
                var groupKeyer = this.indexGroupKeyers[indexName];
                var reducer = this.indexReducers[indexName];
                var updateGroups = uniqueIndex(groupKeyer, valuesToRemove.concat(valuesToAdd));
                valuesToRemove = [];
                valuesToAdd = [];
                for (var _b = 0, updateGroups_1 = updateGroups; _b < updateGroups_1.length; _b++) {
                    var updateGroup = updateGroups_1[_b];
                    var updateGroupKey = updateGroup[0];
                    var prevGroupIndex = oldIndexes[groupIndexName];
                    var iter = Indexer.iterator(prevGroupIndex, updateGroupKey, updateGroupKey.concat([Infinity]));
                    var reverseIter = Indexer.reverseIter(prevGroupIndex, updateGroupKey.concat([Infinity]), updateGroupKey);
                    var remove = reducer(iter, reverseIter);
                    var curGroupIndex = indexes[groupIndexName];
                    iter = Indexer.iterator(curGroupIndex, updateGroupKey, updateGroupKey.concat([Infinity]));
                    reverseIter = Indexer.reverseIter(curGroupIndex, updateGroupKey.concat([Infinity]), updateGroupKey);
                    var add = reducer(iter, reverseIter);
                    if (remove === add)
                        continue;
                    if (remove)
                        valuesToRemove.push(remove);
                    if (add)
                        valuesToAdd.push(add);
                }
            }
            if (!valuesToAdd.length && !valuesToRemove.length) {
                continue;
            }
            index = indexes[indexName] = indexes[indexName].slice();
            for (var _c = 0, valuesToRemove_1 = valuesToRemove; _c < valuesToRemove_1.length; _c++) {
                var value = valuesToRemove_1[_c];
                this.removeFromIndex(index, indexName, value);
            }
            for (var _d = 0, valuesToAdd_1 = valuesToAdd; _d < valuesToAdd_1.length; _d++) {
                var value = valuesToAdd_1[_d];
                this.addToIndex(index, indexName, value);
            }
        }
        return indexes;
    };
    Indexer.prototype.strictValueKeyOf = function (indexName, value) {
        var pk = this.indexKeyers[this.mainIndexName](value);
        if (indexName === this.mainIndexName) {
            return pk;
        }
        var indexKey = this.indexKeyers[indexName](value);
        Array.prototype.push.apply(indexKey, pk);
        return indexKey;
    };
    Indexer.prototype.addToIndex = function (index, indexName, v) {
        var key = this.strictValueKeyOf(indexName, v);
        var startIdx = Indexer.getRangeFrom(index, key).startIdx;
        index.splice(startIdx, 0, [key, v]);
    };
    Indexer.prototype.removeFromIndex = function (index, indexName, v) {
        var key = this.strictValueKeyOf(indexName, v);
        var _a = Indexer.getRangeFrom(index, key, key.concat([null])), startIdx = _a.startIdx, endIdx = _a.endIdx;
        index.splice(startIdx, endIdx - startIdx);
    };
    return Indexer;
}());
exports.Indexer = Indexer;
function uniqueIndex(keyer, values) {
    var result = [];
    for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
        var value = values_1[_i];
        var key = keyer(value);
        var _a = Indexer.getRangeFrom(result, key, key.concat([null])), startIdx = _a.startIdx, endIdx = _a.endIdx;
        result.splice(startIdx, endIdx - startIdx, [key, value]);
    }
    return result;
}
