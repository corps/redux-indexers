export function bisect<T, E>(array: T[], e: E, cmp: (a: E, b: T) => number, l = 0, r = array.length) {
  let mid: number;
  let c: number;

  while (l < r) {
    mid = l + r >>> 1;
    c = cmp(e, array[mid]);
    if (c > 0) {
      l = mid + 1;
    } else {
      r = mid;
    }
  }

  return l;
}

export function arrayCmp(a: any[], b: any[]): number {
  for (let i = 0; i < a.length && i < b.length; ++i) {
    let aVal = a[i];
    let bVal = b[i];

    if (aVal === bVal) continue;

    if (bVal === Infinity) return -1;
    if (aVal === Infinity) return 1;
    if (aVal == null) return -1;
    if (bVal == null) return 1;
    if (aVal < bVal) return -1;
    return 1;
  }

  if (a.length === b.length) return 0;
  if (a.length > b.length) return 1;
  return -1;
}

export function numberCmp(a: number, b: number) {
  return a - b;
}

export type Entry<V> = [any[], V];
export type Index<V> = Entry<V>[];
export type IndexStore<V> = { [k: string]: Index<V> }
export type Keyer<V> = (v: V) => any[];
export type IndexIterator<V> = () => V | 0
export type GroupReducer<V> = (iter: IndexIterator<V>, reverseIter: IndexIterator<V>) => V | 0

function cmpKeyToEntry(a: any[], b: Entry<any>) {
  return arrayCmp(a, b[0]);
}

// export type IndexUpdater<K, V> = (prev: V, )
export class Indexer<V, I extends IndexStore<V>> {
  private indexKeyers = {} as { [k: string]: Keyer<V> };
  private indexDependentGroup = {} as { [k: string]: string };
  private indexGroupKeyers = {} as { [k: string]: Keyer<V> };
  private indexReducers = {} as { [k: string]: GroupReducer<V> };
  private indexes = [] as (keyof I)[];

  constructor(private mainIndexName: keyof I) {
  }

  addIndex(attr: keyof I, keyer: Keyer<V>) {
    if (attr in this.indexKeyers) {
      throw new Error("duplicate definition for index " + attr);
    }
    this.indexKeyers[attr] = keyer;
    this.indexes.push(attr);
  }

  addGroupedIndex(attr: keyof I,
                  keyer: Keyer<V>,
                  groupAttr: keyof I,
                  groupKeyer: Keyer<V>,
                  reducer: GroupReducer<V>) {
    if (!this.indexKeyers[groupAttr]) {
      throw new Error("Dependent index " + groupAttr + " should be defined before " + attr);
    }
    this.addIndex(attr, keyer);

    this.indexDependentGroup[attr] = groupAttr;
    this.indexGroupKeyers[attr] = groupKeyer;
    this.indexReducers[attr] = reducer;
  }

  private _empty: I;

  matchesInitialState(initialState: I) {
    return this._empty === initialState;
  }

  empty(): I {
    if (this._empty) return this._empty;

    let result = this._empty = {} as I;
    for (let k in this.indexKeyers) {
      result[k] = [];
    }

    return result;
  }

  removeAll(indexes: I, values: V[]) {
    if (values.length === 0) return indexes;

    let oldIndexes = indexes;
    indexes = {...(indexes as any)};

    const mainIndexName = this.mainIndexName;

    values.forEach(v => {
      let existing = Indexer.getFirstMatching(indexes[mainIndexName],
        this.strictValueKeyOf(mainIndexName, v));

      if (existing) this.updateValue(indexes, oldIndexes, existing, false);
    });

    return indexes;
  }

  removeByPk(indexes: I, primaryKey: any[]): I {
    return this.removeAll(indexes, Indexer.getAllMatching(indexes[this.mainIndexName], primaryKey));
  }

  update(indexes: I, values: V[]): I {
    if (values.length === 0) return indexes;

    let oldIndexes = indexes;
    indexes = {...(indexes as any)};
    const mainIndexName = this.mainIndexName;

    values.forEach(v => {
      let existing = Indexer.getFirstMatching(indexes[mainIndexName],
        this.strictValueKeyOf(mainIndexName, v));

      if (existing) {
        this.updateValue(indexes, oldIndexes, existing, false);
      }

      this.updateValue(indexes, oldIndexes, v, true);
    });

    return indexes;
  }

  static iterator<V>(index: Index<V>, startKey: any[] = null, endKey: any[] = null): IndexIterator<V> {
    let {startIdx, endIdx} = Indexer.getRangeFrom(index, startKey, endKey);
    let idx = startIdx;

    return () => {
      if (idx < endIdx) {
        return index[idx++][1];
      }
      return null;
    }
  }

  static reverseIter<V>(index: Index<V>, startKey: any[] = null, endKey: any[] = null): IndexIterator<V> {
    if (startKey) startKey = startKey.concat([undefined]);
    if (endKey) endKey = endKey.concat([undefined]);

    let {startIdx, endIdx} = Indexer.getRangeFrom(index, endKey, startKey);
    let idx = endIdx;

    return () => {
      if (idx > startIdx) {
        return index[--idx][1];
      }
      return null;
    }
  }

  static getAllMatching<V>(index: Index<V>, key: any[]): V[] {
    let {startIdx, endIdx} = Indexer.getRangeFrom(index, key, key.concat([Infinity]));
    return index.slice(startIdx, endIdx).map(([_, value]) => value);
  }

  getByPk(indexes: I, key: any[]): V | 0 {
    return Indexer.getFirstMatching(indexes[this.mainIndexName], key);
  }

  static getRangeFrom(index: Index<any>, startKey: any[] = null, endKey: any[] = null) {
    let startIdx: number;
    let endIdx: number;

    if (startKey == null) {
      startIdx = 0;
    } else {
      startIdx = bisect<Entry<any>, any[]>(index, startKey, cmpKeyToEntry);
    }

    if (endKey == null) {
      endIdx = index.length;
    } else {
      endIdx = bisect<Entry<any>, any[]>(index, endKey, cmpKeyToEntry);
    }

    return {startIdx, endIdx};
  }

  static getFirstMatching<V>(index: Index<V>, key: any[]): V | 0 {
    let iter = Indexer.iterator(index, key, key.concat([Infinity]));
    return iter();
  }

  private updateGroupIndex(indexes: I, oldIndexes: I, value: V, indexName: string, groupIndexName: string) {
    let groupKeyer = this.indexGroupKeyers[indexName];
    let reducer = this.indexReducers[indexName];

    let groupKeyset = groupKeyer(value);

    const prevGroupIndex = oldIndexes[groupIndexName];
    let iter = Indexer.iterator(prevGroupIndex,
      groupKeyset,
      groupKeyset.concat([Infinity]));
    let reverseIter = Indexer.reverseIter(prevGroupIndex,
      groupKeyset.concat([Infinity]),
      groupKeyset);
    let remove = reducer(iter, reverseIter);

    const curGroupIndex = indexes[groupIndexName];
    iter = Indexer.iterator(curGroupIndex,
      groupKeyset,
      groupKeyset.concat([Infinity]));
    reverseIter = Indexer.reverseIter(curGroupIndex,
      groupKeyset.concat([Infinity]),
      groupKeyset);
    let add = reducer(iter, reverseIter);

    if (remove === add) return;

    if (remove) this.removeFromIndex(indexes, oldIndexes, indexName, remove);
    if (add) this.addToIndex(indexes, oldIndexes, indexName, add);
  }

  private updateValue(indexes: I,
                      oldIndexes: I,
                      value: V,
                      isAdd: boolean) {

    for (let indexName of this.indexes) {
      const groupIndexName = this.indexDependentGroup[indexName];

      if (groupIndexName) {
        this.updateGroupIndex(indexes, oldIndexes, value, indexName, groupIndexName);
      } else {
        if (isAdd) {
          this.addToIndex(indexes, oldIndexes, indexName, value);
        } else {
          this.removeFromIndex(indexes, oldIndexes, indexName, value);
        }
      }
    }
  }

  private strictValueKeyOf(indexName: keyof I, value: V): any[] {
    let pk = this.indexKeyers[this.mainIndexName](value);

    if (indexName === this.mainIndexName) {
      return pk;
    }

    const indexKey = this.indexKeyers[indexName](value);
    Array.prototype.push.apply(indexKey, pk);
    return indexKey;
  }

  private addToIndex(indexes: I, oldIndexes: I, indexName: keyof I, v: V) {
    let index = indexes[indexName];
    if (index === oldIndexes[indexName]) {
      index = indexes[indexName] = index.slice();
    }

    let key = this.strictValueKeyOf(indexName, v);
    let {startIdx} = Indexer.getRangeFrom(index, key);
    index.splice(startIdx, 0, [key, v]);
  }

  private removeFromIndex(indexes: I, oldIndexes: I, indexName: keyof I, v: V) {
    let index = indexes[indexName];
    if (index === oldIndexes[indexName]) {
      index = indexes[indexName] = index.slice();
    }

    let key = this.strictValueKeyOf(indexName, v);
    let {startIdx, endIdx} = Indexer.getRangeFrom(index, key, key.concat([null]));
    index.splice(startIdx, endIdx - startIdx);
  }
}

type GroupKeyIndex = { group: Index<any[]> }
const groupKeyIndexer = new Indexer<any[], GroupKeyIndex>("group");
groupKeyIndexer.addIndex("group", v => v);

function getUniqueKeys<V>(keyer: Keyer<V>, values: V[]): any[][] {
  let groupIndex = groupKeyIndexer.empty();
  for (let value of values) {
    groupIndex = groupKeyIndexer.update(groupIndex, [keyer(value)]);
  }

  return groupIndex.group.map(([_, v]) => v);
}
