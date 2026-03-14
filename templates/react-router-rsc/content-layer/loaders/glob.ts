import { parse as parseJsonc } from "@std/jsonc";
import { parse as parseYaml } from "@std/yaml";
import { readFile } from "node:fs/promises";
import { glob as fsGlob } from "node:fs/promises";
import { extname, join, relative } from "node:path";

import type { ContentLoader, GenerateIdOptions } from "../api.ts";

import { parseFrontmatter } from "../frontmatter.ts";

interface GlobOptions {
    pattern: string | string[];
    base?: string | URL;
    generateId?: (options: GenerateIdOptions) => string;
}

let MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
let JSON_EXTENSIONS = new Set([".json", ".jsonc"]);
let YAML_EXTENSIONS = new Set([".yaml", ".yml"]);

function defaultGenerateId({ entry }: GenerateIdOptions): string {
    // Strip extension, use forward slashes
    let ext = extname(entry);
    return entry.slice(0, -ext.length).replaceAll("\\", "/");
}

export function glob(globOptions: GlobOptions): ContentLoader {
    let { pattern, base = ".", generateId = defaultGenerateId } = globOptions;
    let baseDir = base instanceof URL ? base.pathname : base;

    return {
        name: "glob",
        schema: null as never, // Schema is provided by the collection, not the loader
        getWatchedPaths() {
            return [baseDir];
        },
        async load(context) {
            let patterns = Array.isArray(pattern) ? pattern : [pattern];

            for (let pat of patterns) {
                let fullPattern = join(baseDir, pat);
                for await (let filePath of fsGlob(fullPattern)) {
                    let relativePath = relative(baseDir, filePath);
                    let ext = extname(filePath);
                    let raw = await readFile(filePath, "utf-8");

                    if (MARKDOWN_EXTENSIONS.has(ext)) {
                        let { data, body } = parseFrontmatter(raw);
                        let id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        let parsedData = await context.parseData({ id, data, filePath });
                        let digest = context.generateDigest(raw);
                        context.store.set({ id, data: parsedData, body, filePath, digest });
                    } else if (JSON_EXTENSIONS.has(ext)) {
                        let data = parseJsonc(raw) as Record<string, unknown>;
                        let id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        let parsedData = await context.parseData({ id, data, filePath });
                        let digest = context.generateDigest(raw);
                        context.store.set({ id, data: parsedData, filePath, digest });
                    } else if (YAML_EXTENSIONS.has(ext)) {
                        let data = parseYaml(raw) as Record<string, unknown>;
                        let id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        let parsedData = await context.parseData({ id, data, filePath });
                        let digest = context.generateDigest(raw);
                        context.store.set({ id, data: parsedData, filePath, digest });
                    }
                }
            }
        },
    };
}
