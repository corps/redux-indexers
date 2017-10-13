export declare function bisect<T, E>(array: T[], e: E, cmp: (a: E, b: T) => number, l?: number, r?: number): number;
export declare function arrayCmp(a: any[], b: any[]): number;
export declare function numberCmp(a: number, b: number): number;
export declare type Entry<V> = [any[], V];
export declare type Index<V> = Entry<V>[];
export declare type IndexStore<V> = {
    [k: string]: Index<V>;
};
export declare type Keyer<V> = (v: V) => any[];
export declare type IndexIterator<V> = () => V | void;
export declare type GroupReducer<V> = (iter: IndexIterator<V>, reverseIter: IndexIterator<V>) => V | void;
export declare class Indexer<V, I extends IndexStore<V>> {
    private mainIndexName;
    private indexKeyers;
    private indexDependentGroup;
    private indexGroupKeyers;
    private indexReducers;
    private indexes;
    constructor(mainIndexName: keyof I);
    addIndex(attr: keyof I, keyer: Keyer<V>): void;
    addGroupedIndex(attr: keyof I, keyer: Keyer<V>, groupAttr: keyof I, groupKeyer: Keyer<V>, reducer: GroupReducer<V>): void;
    private _empty;
    matchesInitialState(initialState: I): boolean;
    empty(): I;
    removeAll(indexes: I, values: V[]): I;
    removeByPk(indexes: I, primaryKey: any[]): I;
    update(indexes: I, values: V[]): I;
    static iterator<V>(index: Index<V>, startKey?: any[], endKey?: any[]): IndexIterator<V>;
    static reverseIter<V>(index: Index<V>, startKey?: any[], endKey?: any[]): IndexIterator<V>;
    static getAllMatching<V>(index: Index<V>, key: any[]): V[];
    static getAllUniqueMatchingAnyOf<V>(index: Index<V>, keys: any[][]): V[];
    static getRangeFrom(index: Index<any>, startKey?: any[], endKey?: any[]): {
        startIdx: number;
        endIdx: number;
    };
    static getFirstMatching<V>(index: Index<V>, key: any[]): V | void;
    private splice(indexes, removeValues, addValues);
    private strictValueKeyOf(indexName, value);
    private addToIndex(index, indexName, v);
    private removeFromIndex(index, indexName, v);
}
