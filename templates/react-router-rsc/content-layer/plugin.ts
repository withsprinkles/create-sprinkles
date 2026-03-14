import type { Plugin, ResolvedConfig, ViteDevServer } from "vite-plus";

import { parseSafe } from "@remix-run/data-schema";
import { mkdir, writeFile } from "node:fs/promises";
import { register } from "node:module";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Collection, DataStore, LoaderContext, ParseDataOptions } from "./api.ts";

import { generateTypes } from "./codegen.ts";
import { generateDigest } from "./digest.ts";
import { createDataStore, createMetaStore } from "./store.ts";

/** Serializes a value to a JavaScript expression string, preserving Date instances. */
function toJSLiteral(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === "boolean" || typeof value === "number") return String(value);
    if (typeof value === "string") return JSON.stringify(value);
    if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
    if (Array.isArray(value)) return `[${value.map(toJSLiteral).join(",")}]`;
    if (typeof value === "object") {
        let entries = Object.entries(value as Record<string, unknown>).map(
            ([k, v]) => `${JSON.stringify(k)}:${toJSLiteral(v)}`,
        );
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

let VIRTUAL_MODULE_ID = "sprinkles:content";
let RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;
let VIRTUAL_STORE_ID = "virtual:sprinkles-content/store";
let RESOLVED_STORE_ID = `\0${VIRTUAL_STORE_ID}`;
let VIRTUAL_ENTRY_PREFIX = "virtual:sprinkles-content/entry/";
// No \0 prefix so @mdx-js/rollup's transform hook can process these modules.
// The .mdx suffix signals @mdx-js/rollup to compile the raw markdown.
let RESOLVED_ENTRY_PREFIX = VIRTUAL_ENTRY_PREFIX;

interface ContentLayerPluginOptions {
    /** Path to the content config file, relative to the project root. Defaults to "app/content.config.ts" */
    configPath?: string;
}

export function contentLayer(options: ContentLayerPluginOptions = {}): Plugin {
    let { configPath = "app/content.config.ts" } = options;
    let config: ResolvedConfig;
    let stores = new Map<string, DataStore>();
    let collections: Record<string, Collection> = {};
    // Map of entry file paths to their collection entries for HMR.
    // Multiple entries can share the same file (e.g. a JSONC file with an array of entries).
    let entryFilePaths = new Map<string, { collection: string; id: string }[]>();
    // Resolved paths that should trigger content reloads (files and directories from loaders)
    let watchedContentPaths = new Set<string>();

    async function loadConfig(root: string): Promise<Record<string, Collection>> {
        let fullPath = resolve(root, configPath);
        // Use dynamic import with timestamp to bust cache during dev
        let mod = await import(/* @vite-ignore */ `${fullPath}?t=${Date.now()}`);
        return mod.collections ?? {};
    }

    function createParseData(schema: Collection["schema"]): LoaderContext["parseData"] {
        return async <Data extends Record<string, unknown>>(
            props: ParseDataOptions<Data>,
        ): Promise<Data> => {
            if (!schema) return props.data;
            // Resolve schema (may be a function that takes SchemaContext)
            let resolvedSchema =
                typeof schema === "function"
                    ? schema({
                          image: () =>
                              ({
                                  "~standard": {
                                      version: 1,
                                      vendor: "data-schema",
                                      validate: (v: unknown) => ({ value: v as string }),
                                  },
                              }) as never,
                      })
                    : schema;
            let result = parseSafe(resolvedSchema, props.data);
            if (!result.success) {
                let messages = result.issues.map(i => i.message).join(", ");
                throw new Error(`Validation failed for entry "${props.id}": ${messages}`);
            }
            return result.value as Data;
        };
    }

    /**
     * Loads all collections and populates stores. Uses atomic swap so that on error,
     * the previous valid state is preserved.
     */
    async function runLoaders(root: string, server?: ViteDevServer) {
        let newCollections = await loadConfig(root);
        let newStores = new Map<string, DataStore>();
        let newEntryFilePaths = new Map<string, { collection: string; id: string }[]>();
        let newWatchedPaths = new Set<string>();

        // Always watch the config file itself
        newWatchedPaths.add(resolve(root, configPath));

        for (let [name, collection] of Object.entries(newCollections)) {
            let store = createDataStore();
            let meta = createMetaStore();
            newStores.set(name, store);

            // Collect watched paths from loader
            let loaderPaths = collection.loader.getWatchedPaths?.() ?? [];
            for (let p of loaderPaths) {
                newWatchedPaths.add(resolve(root, p));
            }

            let context: LoaderContext = {
                collection: name,
                store,
                meta,
                parseData: createParseData(collection.schema),
                renderMarkdown: async markdown => ({ html: markdown }),
                generateDigest,
                watcher: server?.watcher as LoaderContext["watcher"],
            };

            await collection.loader.load(context);

            // Track file paths for HMR
            for (let entry of store.values()) {
                if (entry.filePath) {
                    let key = resolve(root, entry.filePath);
                    let existing = newEntryFilePaths.get(key) ?? [];
                    existing.push({ collection: name, id: entry.id });
                    newEntryFilePaths.set(key, existing);
                }
            }
        }

        // Atomic swap: only update state after everything succeeds
        collections = newCollections;
        stores = newStores;
        entryFilePaths = newEntryFilePaths;
        watchedContentPaths = newWatchedPaths;
    }

    /** Checks whether a file path is a content-related path that should trigger a reload. */
    function isContentPath(filePath: string): boolean {
        let resolved = resolve(filePath);
        // Direct match: tracked entry file or watched path
        if (entryFilePaths.has(resolved)) return true;
        if (watchedContentPaths.has(resolved)) return true;
        // Check if file is under a watched directory
        for (let watched of watchedContentPaths) {
            if (resolved.startsWith(`${watched}/`)) return true;
        }
        return false;
    }

    function serializeStores(): string {
        let data: Record<string, Record<string, unknown>> = {};
        for (let [name, store] of stores) {
            let entries: Record<string, unknown> = {};
            for (let entry of store.values()) {
                // Exclude body from serialized store (it's in virtual entry modules)
                let { body, rendered, ...rest } = entry;
                entries[entry.id] = { ...rest, collection: name };
            }
            data[name] = entries;
        }
        return toJSLiteral(data);
    }

    /** Generates a static import map for all entries with body content. */
    function generateImporterMap(): string {
        let lines: string[] = [];
        for (let [name, store] of stores) {
            for (let entry of store.values()) {
                if (entry.body) {
                    let key = `${name}/${entry.id}`;
                    lines.push(
                        `${JSON.stringify(key)}: () => import(${JSON.stringify(`${VIRTUAL_ENTRY_PREFIX}${key}`)})`,
                    );
                }
            }
        }
        return `{${lines.join(",\n")}}`;
    }

    async function writeTypes(root: string) {
        let outDir = join(root, ".sprinkles", "content-layer");
        await mkdir(outDir, { recursive: true });

        let collectionInfos: Record<string, { schema: unknown }> = {};
        for (let [name, collection] of Object.entries(collections)) {
            collectionInfos[name] = { schema: collection.schema };
        }
        let configRelPath = relative(outDir, resolve(root, configPath)).replace(/\\/g, "/");
        let types = generateTypes(
            collectionInfos as Record<string, { schema: never }>,
            configRelPath,
        );
        await writeFile(join(outDir, "content.d.ts"), types);
    }

    /** Invalidates all content virtual modules across all Vite environments (client, ssr, rsc). */
    function invalidateContentModules(server: ViteDevServer, entryKeys?: string[]) {
        let moduleIds = [RESOLVED_VIRTUAL_ID, RESOLVED_STORE_ID];
        if (entryKeys) {
            for (let key of entryKeys) {
                moduleIds.push(`${VIRTUAL_ENTRY_PREFIX}${key}.mdx`);
            }
        }

        for (let env of Object.values(server.environments)) {
            for (let id of moduleIds) {
                let mod = env.moduleGraph.getModuleById(id);
                if (mod) env.moduleGraph.invalidateModule(mod);
            }
        }
    }

    /** Handles a content-related file event during development. */
    async function handleContentChange(server: ViteDevServer, filePath: string) {
        let resolvedPath = resolve(filePath);
        if (!isContentPath(resolvedPath)) return;

        // Collect entry keys that existed before reload for module invalidation
        let previousEntryKeys: string[] = [];
        let mappings = entryFilePaths.get(resolvedPath);
        if (mappings) {
            for (let m of mappings) {
                previousEntryKeys.push(`${m.collection}/${m.id}`);
            }
        }

        try {
            await runLoaders(config.root, server);
            await writeTypes(config.root);
        } catch (error) {
            config.logger.error(
                `[content-layer] ${error instanceof Error ? error.message : String(error)}`,
            );
            // Keep previous valid state — don't reload with broken content
            return;
        }

        // Collect new entry keys for the changed file
        let newMappings = entryFilePaths.get(resolvedPath);
        let entryKeys = [...previousEntryKeys];
        if (newMappings) {
            for (let m of newMappings) {
                let key = `${m.collection}/${m.id}`;
                if (!entryKeys.includes(key)) entryKeys.push(key);
            }
        }

        invalidateContentModules(server, entryKeys);
        server.hot.send({ type: "full-reload" });
    }

    return {
        name: "sprinkles-content-layer",

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            // Register a Node.js resolve hook so native import() can handle sprinkles: imports.
            // This is needed because loadConfig uses native import() which bypasses Vite's plugin pipeline.
            let hookPath = resolve(config.root, "content-layer/resolve-hook.js");
            register(pathToFileURL(hookPath));
        },

        async buildStart() {
            try {
                await runLoaders(config.root);
                await writeTypes(config.root);
            } catch (error) {
                // In build mode, errors should fail the build
                if (config.command === "build") throw error;
                // In dev mode, log the error and continue with empty/previous state
                config.logger.error(
                    `[content-layer] Failed to load content:\n${error instanceof Error ? error.message : String(error)}`,
                );
            }
        },

        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) {
                return RESOLVED_VIRTUAL_ID;
            }
            if (id === VIRTUAL_STORE_ID) {
                return RESOLVED_STORE_ID;
            }
            if (id.startsWith(VIRTUAL_ENTRY_PREFIX) && !id.endsWith(".mdx")) {
                // Add .mdx extension so @mdx-js/rollup's transform hook compiles it
                return `${id}.mdx`;
            }
        },

        load(id) {
            if (id === RESOLVED_VIRTUAL_ID) {
                return `
import "server-only";
export { defineCollection, reference } from "${resolve(config.root, "content-layer/config.ts")}";

import { createRuntime } from "${resolve(config.root, "content-layer/runtime.ts")}";
import { createDataStore } from "${resolve(config.root, "content-layer/store.ts")}";

let storeData = ${serializeStores()};

let importers = ${generateImporterMap()};

let stores = new Map();
for (let [name, entries] of Object.entries(storeData)) {
  let store = createDataStore();
  for (let entry of Object.values(entries)) {
    store.set(entry);
  }
  stores.set(name, store);
}

let runtime = createRuntime(stores, importers);
export let getCollection = runtime.getCollection;
export let getEntry = runtime.getEntry;
export let getEntries = runtime.getEntries;
export let render = runtime.render;
`;
            }

            if (id === RESOLVED_STORE_ID) {
                return `export default ${serializeStores()};`;
            }

            if (id.startsWith(RESOLVED_ENTRY_PREFIX) && id.endsWith(".mdx")) {
                // virtual:sprinkles-content/entry/<collection>/<id>.mdx
                let path = id.slice(RESOLVED_ENTRY_PREFIX.length, -4);
                let slashIndex = path.indexOf("/");
                let collectionName = path.slice(0, slashIndex);
                let entryId = path.slice(slashIndex + 1);

                let store = stores.get(collectionName);
                if (!store) return null;

                let entry = store.get(entryId);
                if (!entry?.body) return null;

                // Return raw MDX/MD content - @mdx-js/rollup will transform it
                return {
                    code: entry.body,
                    // Signal to @mdx-js/rollup that this is MDX
                    map: null,
                };
            }
        },

        configureServer(server) {
            // Watch for content file changes, additions, and deletions
            server.watcher.on("change", filePath => handleContentChange(server, filePath));
            server.watcher.on("add", filePath => handleContentChange(server, filePath));
            server.watcher.on("unlink", filePath => handleContentChange(server, filePath));
        },

        handleHotUpdate({ file }) {
            let resolvedPath = resolve(file);
            if (isContentPath(resolvedPath)) {
                // Already handled in configureServer watcher
                return [];
            }
        },
    };
}
