import type { DataEntry, DataStore, MetaStore } from "./api.ts";

export function createDataStore<
    D extends Record<string, unknown> = Record<string, unknown>,
>(): DataStore<D> {
    let map = new Map<string, DataEntry>();

    return {
        get(key) {
            return map.get(key) as DataEntry<D> | undefined;
        },
        set(entry) {
            let existing = map.get(entry.id);
            // Skip update if both entries have a digest and they match
            if (existing?.digest && entry.digest && existing.digest === entry.digest) {
                return false;
            }
            map.set(entry.id, entry);
            return true;
        },
        entries() {
            return [...map.entries()] as [string, DataEntry<D>][];
        },
        keys() {
            return [...map.keys()];
        },
        values() {
            return [...map.values()] as DataEntry<D>[];
        },
        delete(key) {
            map.delete(key);
        },
        clear() {
            map.clear();
        },
        has(key) {
            return map.has(key);
        },
    };
}

export function createMetaStore(): MetaStore {
    let map = new Map<string, string>();

    return {
        get(key) {
            return map.get(key);
        },
        set(key, value) {
            map.set(key, value);
        },
        delete(key) {
            map.delete(key);
        },
        has(key) {
            return map.has(key);
        },
    };
}
