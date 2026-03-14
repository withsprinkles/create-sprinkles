import type { CreatedDirectory } from "bingo-fs";

function isDirectory(value: unknown): value is CreatedDirectory {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeFiles(...layers: (CreatedDirectory | null | void)[]): CreatedDirectory {
    const result: CreatedDirectory = {};

    for (const layer of layers) {
        if (layer) {
            for (const [key, value] of Object.entries(layer)) {
                const existing = result[key];

                if (isDirectory(existing) && isDirectory(value)) {
                    result[key] = mergeFiles(existing, value as CreatedDirectory);
                } else {
                    result[key] = value;
                }
            }
        }
    }

    return result;
}
