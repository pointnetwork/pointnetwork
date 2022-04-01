export interface Storer<T> {
    find: (id: string) => Promise<T | undefined>;
    insert: (p: T) => Promise<string>;
    update: (p: T) => Promise<string>;
    remove: (id: string) => Promise<string>;
}
