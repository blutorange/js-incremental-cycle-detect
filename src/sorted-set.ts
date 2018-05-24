declare module "sorted-set" {
    export = SortedSet;

    interface SortedSetOptions<T> {
        hash?: (entry: T) => number;
        compare?: (x: T, y: T) => number;
    }
    class SortedSet<T> {
        constructor(opts?: SortedSetOptions<T>);
        add(object: T): T | null;
        has(object: T): boolean;
        del(object: T): T | null;
        values(): T[];
        length: number;
    }
}