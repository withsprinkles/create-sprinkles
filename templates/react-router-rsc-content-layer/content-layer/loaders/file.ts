import { parse as parseJsonc } from "@std/jsonc";
import { parse as parseYaml } from "@std/yaml";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import type { ContentLoader } from "../api.ts";

interface FileOptions {
    parser?: (text: string) => Record<string, Record<string, unknown>> | Record<string, unknown>[];
}

const YAML_EXTENSIONS = new Set([".yaml", ".yml"]);

function defaultParser(text: string, ext: string) {
    if (YAML_EXTENSIONS.has(ext)) {
        return parseYaml(text) as
            | Record<string, Record<string, unknown>>
            | Record<string, unknown>[];
    }
    // JSON and JSONC both handled by JSONC parser (superset)
    return parseJsonc(text) as Record<string, Record<string, unknown>> | Record<string, unknown>[];
}

export function file(fileName: string, options?: FileOptions): ContentLoader {
    return {
        getWatchedPaths() {
            return [fileName];
        },
        async load(context) {
            let raw = await readFile(fileName, "utf-8");
            let ext = extname(fileName);
            let parsed = options?.parser ? options.parser(raw) : defaultParser(raw, ext);

            if (Array.isArray(parsed)) {
                // Array of objects with `id` field
                for (let item of parsed) {
                    let record = item as Record<string, unknown>;
                    let id = record.id as string;
                    let data = await context.parseData({ id, data: record, filePath: fileName });
                    let digest = context.generateDigest(record);
                    context.store.set({ id, data, filePath: fileName, digest });
                }
            } else {
                // Object with string keys as IDs
                for (let [id, value] of Object.entries(parsed)) {
                    let data = await context.parseData({ id, data: value, filePath: fileName });
                    let digest = context.generateDigest(value);
                    context.store.set({ id, data, filePath: fileName, digest });
                }
            }
        },
        name: "file",
        schema: null as never,
    };
}
