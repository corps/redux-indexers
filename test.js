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
var index_1 = require("./index");
var assert = require("assert");
function attributeKeyer() {
    var k = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        k[_i] = arguments[_i];
    }
    return function (o) {
        return k.map(function (a) { return o[a]; });
    };
}
var indexer = new index_1.Indexer("byId");
indexer.addIndex("byId", attributeKeyer("id"));
indexer.addIndex("byColorAndSize", attributeKeyer("color", "size"));
indexer.addIndex("bySize", attributeKeyer("size"));
indexer.addGroupedIndex("bySizeOfColorBiggest", attributeKeyer("size"), "byColorAndSize", attributeKeyer("color"), function (iter, reverseIter) {
    return reverseIter();
});
var lastCupId = 0;
var firstCup = { size: 0, color: "a", id: lastCupId };
function largeCupThan(cup) {
    return __assign({}, cup, { id: (++lastCupId), size: cup.size + 1 });
}
function shrinkCup(cup) {
    return __assign({}, cup, { size: cup.size - 1 });
}
function shareColorWith(cup, cup2) {
    return __assign({}, cup, { color: cup2.color });
}
function smallerCupThan(cup) {
    return __assign({}, cup, { id: (++lastCupId), size: cup.size - 1 });
}
function differentColorThan(cup) {
    return __assign({}, cup, { id: (++lastCupId), color: cup.color + "a" });
}
function similarCup(cup) {
    return __assign({}, cup, { id: (++lastCupId) });
}
function accumulate(index) {
    var result = [];
    var iterator = index_1.Indexer.iterator(index);
    for (var v = iterator(); v; v = iterator()) {
        result.push(v);
    }
    return result;
}
function reverseAccumulate(index, startKey, endKey) {
    if (startKey === void 0) { startKey = null; }
    if (endKey === void 0) { endKey = null; }
    var result = [];
    var iterator = index_1.Indexer.reverseIter(index, startKey, endKey);
    for (var v = iterator(); v; v = iterator()) {
        result.push(v);
    }
    return result;
}
var indexes;
var previousIndexes;
function assertReferenceChanges(newIndexes) {
    assert.notStrictEqual(newIndexes, indexes, "reference should change");
    previousIndexes = indexes;
    indexes = newIndexes;
    return indexes;
}
function assertReferenceDoesNotChange(newStore) {
    assert.strictEqual(newStore, indexes, "reference should not change");
    return indexes;
}
function test(description, f) {
    indexes = indexer.empty();
    previousIndexes = null;
    f();
    console.log(description, "passed.");
}
test("bisect finds the correct insert index", function () {
    var ids = [1, 4, 9, 12, 27];
    function subject(targetNumber) {
        return index_1.bisect(ids, targetNumber, index_1.numberCmp);
    }
    assert.equal(subject(11), 3);
    assert.equal(subject(3), 1);
    assert.equal(subject(-1), 0);
    assert.equal(subject(100), 5);
});
test("add / remove", function () {
    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [12]));
    var cup1 = firstCup;
    var cup2 = differentColorThan(largeCupThan(cup1));
    var cup3 = smallerCupThan(similarCup(cup2));
    var cup4 = largeCupThan(largeCupThan(cup1));
    var cup5 = largeCupThan(largeCupThan(cup3));
    assertReferenceChanges(indexer.update(indexes, [cup2]));
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.update(indexes, [cup1]));
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.update(indexes, [cup4]));
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.update(indexes, [cup3]));
    assert.strictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [cup5.id]));
    assert.deepEqual(accumulate(indexes.byId), [cup1, cup2, cup3, cup4], "keeps cups organized by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup1, cup4, cup3, cup2], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [cup1, cup3, cup2, cup4], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [cup2, cup4], "keeps cups organized by size of per color biggest");
    assert.strictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.removeByPk(indexes, [cup2.id]));
    assert.deepEqual(accumulate(indexes.byId), [cup1, cup3, cup4], "keeps cups organize by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup1, cup4, cup3], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [cup1, cup3, cup4], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [cup3, cup4], "keeps cups organized by size of per color biggest");
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.removeByPk(indexes, [cup1.id]));
    assert.deepEqual(accumulate(indexes.byId), [cup3, cup4], "keeps cups organized by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup4, cup3], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [cup3, cup4], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [cup3, cup4], "keeps cups organized by size of per color biggest");
    assert.strictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceDoesNotChange(indexer.removeByPk(indexes, [cup1.id]));
    assert.deepEqual(accumulate(indexes.byId), [cup3, cup4], "keeps cups organized by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup4, cup3], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [cup3, cup4], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [cup3, cup4], "keeps cups organized by size of per color biggest");
    assert.strictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.removeByPk(indexes, [cup3.id]));
    assert.deepEqual(accumulate(indexes.byId), [cup4], "keeps cups organized by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup4], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [cup4], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [cup4], "keeps cups organized by size of per color biggest");
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
    assertReferenceChanges(indexer.removeByPk(indexes, [cup4.id]));
    assert.deepEqual(accumulate(indexes.byId), [], "keeps cups organized by id");
    assert.deepEqual(accumulate(indexes.byColorAndSize), [], "keeps cups organized by color and size");
    assert.deepEqual(accumulate(indexes.bySize), [], "keeps cups organized by size");
    assert.deepEqual(accumulate(indexes.bySizeOfColorBiggest), [], "keeps cups organized by size of per color biggest");
    assert.notStrictEqual(indexes.bySizeOfColorBiggest, previousIndexes.bySizeOfColorBiggest);
});
test("getByPk", function () {
    var cup1 = firstCup;
    var cup2 = differentColorThan(cup1);
    var cup3 = largeCupThan(cup2);
    var cup4 = similarCup(cup3);
    assertReferenceChanges(indexer.update(indexes, [cup2, cup3, cup1]));
    assert.equal(indexer.getByPk(indexes, [cup4.id]), null);
    assert.strictEqual(indexer.getByPk(indexes, [cup2.id]), cup2);
    assert.strictEqual(indexer.getByPk(indexes, [cup1.id]), cup1);
    assert.strictEqual(indexer.getByPk(indexes, [cup3.id]), cup3);
});
test("update managing indexes", function () {
    var cup1 = firstCup;
    var cup2 = differentColorThan(cup1);
    var cup3 = differentColorThan(cup1);
    var cup4 = largeCupThan(cup1);
    var cup5 = smallerCupThan(cup2);
    var cup6 = largeCupThan(cup3);
    var cup7 = largeCupThan(cup6);
    assertReferenceChanges(indexer.update(indexes, [cup2, cup6, cup4, cup3, cup5, cup7, cup1]));
    assert.deepEqual(accumulate(indexes.byId), [cup1, cup2, cup3, cup4, cup5, cup6, cup7]);
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup1, cup4, cup5, cup2, cup3, cup6, cup7]);
    assert.deepEqual(accumulate(indexes.bySize), [cup5, cup1, cup2, cup3, cup4, cup6, cup7]);
    cup4 = shrinkCup(shrinkCup(cup4));
    assertReferenceChanges(indexer.update(indexes, [cup4]));
    assert.deepEqual(accumulate(indexes.byId), [cup1, cup2, cup3, cup4, cup5, cup6, cup7]);
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup4, cup1, cup5, cup2, cup3, cup6, cup7]);
    assert.deepEqual(accumulate(indexes.bySize), [cup4, cup5, cup1, cup2, cup3, cup6, cup7]);
    cup7 = shareColorWith(cup7, cup4);
    assertReferenceChanges(indexer.update(indexes, [cup7]));
    assert.deepEqual(accumulate(indexes.byId), [cup1, cup2, cup3, cup4, cup5, cup6, cup7]);
    assert.deepEqual(accumulate(indexes.byColorAndSize), [cup4, cup1, cup7, cup5, cup2, cup3, cup6]);
    assert.deepEqual(accumulate(indexes.bySize), [cup4, cup5, cup1, cup2, cup3, cup6, cup7]);
});
test("reverseIter", function () {
    var cup1 = firstCup;
    var cup2 = smallerCupThan(cup1);
    var cup3 = smallerCupThan(cup2);
    var cup4 = smallerCupThan(cup3);
    var cup5 = smallerCupThan(cup4);
    assertReferenceChanges(indexer.update(indexes, [cup2, cup1, cup3]));
    assertReferenceChanges(indexer.update(indexes, [cup5, cup4]));
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup2.size, Infinity], [cup4.size, cup4.id, "a"]), [cup2, cup3]);
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup2.size, Infinity], [cup4.size, cup4.id]), [cup2, cup3]);
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup2.size, Infinity], [cup4.size - 0.1]), [cup2, cup3, cup4]);
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup2.size, Infinity], [cup2.size, Infinity]), []);
    assert.deepEqual(reverseAccumulate(indexes.bySize, [cup3.size, Infinity]), [cup3, cup4, cup5]);
    assert.deepEqual(reverseAccumulate(indexes.bySize), [cup1, cup2, cup3, cup4, cup5]);
});
test("performance", function () {
    var cups = [];
    function randomColor() {
        var v = Math.random();
        if (v < 0.10)
            return "red";
        if (v < 0.25)
            return "orange";
        if (v < 0.45)
            return "blue";
        if (v < 0.6)
            return "green";
        if (v < 9)
            return "yellow";
        return "purple";
    }
    for (var i = 0; i < 2500; ++i) {
        cups.push({ id: ++lastCupId, color: randomColor(), size: Math.floor(Math.random() * 74832) });
    }
    var start = Date.now();
    cups.forEach(function (cup) {
        indexes = indexer.update(indexes, [cup]);
    });
    cups.forEach(function (cup) {
        indexes = indexer.removeByPk(indexes, [cup.id]);
    });
    var time = Date.now() - start;
    console.log("Permonace: 2500 inserts and removals in", time, "ms");
});
