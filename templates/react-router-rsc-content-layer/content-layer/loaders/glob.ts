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

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const JSON_EXTENSIONS = new Set([".json", ".jsonc"]);
const YAML_EXTENSIONS = new Set([".yaml", ".yml"]);

function defaultGenerateId({ entry }: GenerateIdOptions): string {
    // Strip extension, use forward slashes
    const ext = extname(entry);
    return entry.slice(0, -ext.length).replaceAll("\\", "/");
}

export function glob(globOptions: GlobOptions): ContentLoader {
    const { pattern, base = ".", generateId = defaultGenerateId } = globOptions;
    const baseDir = base instanceof URL ? base.pathname : base;

    return {
        name: "glob",
        schema: null as never, // Schema is provided by the collection, not the loader
        getWatchedPaths() {
            return [baseDir];
        },
        async load(context) {
            const patterns = Array.isArray(pattern) ? pattern : [pattern];

            for (const pat of patterns) {
                const fullPattern = join(baseDir, pat);
                for await (const filePath of fsGlob(fullPattern)) {
                    const relativePath = relative(baseDir, filePath);
                    const ext = extname(filePath);
                    const raw = await readFile(filePath, "utf-8");

                    if (MARKDOWN_EXTENSIONS.has(ext)) {
                        const { data, body } = parseFrontmatter(raw);
                        const id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        const parsedData = await context.parseData({ id, data, filePath });
                        const digest = context.generateDigest(raw);
                        context.store.set({ body, data: parsedData, digest, filePath, id });
                    } else if (JSON_EXTENSIONS.has(ext)) {
                        const data = parseJsonc(raw) as Record<string, unknown>;
                        const id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        const parsedData = await context.parseData({ id, data, filePath });
                        const digest = context.generateDigest(raw);
                        context.store.set({ data: parsedData, digest, filePath, id });
                    } else if (YAML_EXTENSIONS.has(ext)) {
                        const data = parseYaml(raw) as Record<string, unknown>;
                        const id = generateId({
                            entry: relativePath,
                            base: new URL(`file://${baseDir}`),
                            data,
                        });
                        const parsedData = await context.parseData({ id, data, filePath });
                        const digest = context.generateDigest(raw);
                        context.store.set({ data: parsedData, digest, filePath, id });
                    }
                }
            }
        },
    };
}
