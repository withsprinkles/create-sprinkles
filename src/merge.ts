import type { FileTree } from "./types.ts";

function isDirectory(value: unknown): value is FileTree {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !Buffer.isBuffer(value);
}

export function mergeFiles(...layers: (FileTree | null | void)[]): FileTree {
    const result: FileTree = {};

    for (const layer of layers) {
        if (layer) {
            for (const [key, value] of Object.entries(layer)) {
                const existing = result[key];

                if (isDirectory(existing) && isDirectory(value)) {
                    result[key] = mergeFiles(existing, value as FileTree);
                } else {
                    result[key] = value;
                }
            }
        }
    }

    return result;
}
