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
    if (value === null || value === undefined) {
        return String(value);
    }
    if (typeof value === "boolean" || typeof value === "number") {
        return String(value);
    }
    if (typeof value === "string") {
        return JSON.stringify(value);
    }
    if (value instanceof Date) {
        return `new Date(${JSON.stringify(value.toISOString())})`;
    }
    if (Array.isArray(value)) {
        return `[${value.map(toJSLiteral).join(",")}]`;
    }
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>).map(
            ([k, v]) => `${JSON.stringify(k)}:${toJSLiteral(v)}`,
        );
        return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
}

const VIRTUAL_MODULE_ID = "sprinkles:content";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;
const VIRTUAL_STORE_ID = "virtual:sprinkles-content/store";
const RESOLVED_STORE_ID = `\0${VIRTUAL_STORE_ID}`;
const VIRTUAL_ENTRY_PREFIX = "virtual:sprinkles-content/entry/";
// No \0 prefix so @mdx-js/rollup's transform hook can process these modules.
// The .mdx suffix signals @mdx-js/rollup to compile the raw markdown.
const RESOLVED_ENTRY_PREFIX = VIRTUAL_ENTRY_PREFIX;

interface ContentLayerPluginOptions {
    /** Path to the content config file, relative to the project root. Defaults to "app/content.config.ts" */
    configPath?: string;
}

export function contentLayer(options: ContentLayerPluginOptions = {}): Plugin {
    const { configPath = "app/content.config.ts" } = options;
    let config: ResolvedConfig;
    let stores = new Map<string, DataStore>();
    // Map of entry file paths to their collection entries for HMR.
    // Multiple entries can share the same file (e.g. a JSONC file with an array of entries).
    let entryFilePaths = new Map<string, { collection: string; id: string }[]>();
    // Resolved paths that should trigger content reloads (files and directories from loaders)
    let watchedContentPaths = new Set<string>();

    async function loadConfig(root: string): Promise<Record<string, Collection>> {
        const fullPath = resolve(root, configPath);
        // Use dynamic import with timestamp to bust cache during dev
        const mod = await import(/* @vite-ignore */ `${fullPath}?t=${Date.now()}`);
        return mod.collections ?? {};
    }

    function createParseData(schema: Collection["schema"]): LoaderContext["parseData"] {
        return async <Data extends Record<string, unknown>>(
            props: ParseDataOptions<Data>,
        ): Promise<Data> => {
            if (!schema) {
                return props.data;
            }
            // Resolve schema (may be a function that takes SchemaContext)
            const resolvedSchema =
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
            const result = parseSafe(resolvedSchema, props.data);
            if (!result.success) {
                const messages = result.issues.map(i => i.message).join(", ");
                throw new Error(`Validation failed for entry "${props.id}": ${messages}`);
            }
            return result.value as Data;
        };
    }

    /**
     * Loads all collections and populates stores. Uses atomic swap so that on error,
     * the previous valid state is preserved.
     */
    async function runLoaders(
        root: string,
        loadedCollections: Record<string, Collection>,
        server?: ViteDevServer,
    ) {
        const newStores = new Map<string, DataStore>();
        const newEntryFilePaths = new Map<string, { collection: string; id: string }[]>();
        const newWatchedPaths = new Set<string>();

        // Always watch the config file itself
        newWatchedPaths.add(resolve(root, configPath));

        for (const [name, collection] of Object.entries(loadedCollections)) {
            const store = createDataStore();
            const meta = createMetaStore();
            newStores.set(name, store);

            // Collect watched paths from loader
            const loaderPaths = collection.loader.getWatchedPaths?.() ?? [];
            for (const p of loaderPaths) {
                newWatchedPaths.add(resolve(root, p));
            }

            const context: LoaderContext = {
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
            for (const entry of store.values()) {
                if (entry.filePath) {
                    const key = resolve(root, entry.filePath);
                    const existing = newEntryFilePaths.get(key) ?? [];
                    existing.push({ collection: name, id: entry.id });
                    newEntryFilePaths.set(key, existing);
                }
            }
        }

        // Atomic swap: only update state after everything succeeds
        stores = newStores;
        entryFilePaths = newEntryFilePaths;
        watchedContentPaths = newWatchedPaths;
    }

    /** Checks whether a file path is a content-related path that should trigger a reload. */
    function isContentPath(filePath: string): boolean {
        const resolved = resolve(filePath);
        // Direct match: tracked entry file or watched path
        if (entryFilePaths.has(resolved)) {
            return true;
        }
        if (watchedContentPaths.has(resolved)) {
            return true;
        }
        // Check if file is under a watched directory
        for (const watched of watchedContentPaths) {
            if (resolved.startsWith(`${watched}/`)) {
                return true;
            }
        }
        return false;
    }

    function serializeStores(): string {
        const data: Record<string, Record<string, unknown>> = {};
        for (const [name, store] of stores) {
            const entries: Record<string, unknown> = {};
            for (const entry of store.values()) {
                // Exclude body from serialized store (it's in virtual entry modules)
                const { body, rendered, ...rest } = entry;
                entries[entry.id] = { ...rest, collection: name };
            }
            data[name] = entries;
        }
        return toJSLiteral(data);
    }

    /** Generates a static import map for all entries with body content. */
    function generateImporterMap(): string {
        const lines: string[] = [];
        for (const [name, store] of stores) {
            for (const entry of store.values()) {
                if (entry.body) {
                    const key = `${name}/${entry.id}`;
                    lines.push(
                        `${JSON.stringify(key)}: () => import(${JSON.stringify(`${VIRTUAL_ENTRY_PREFIX}${key}`)})`,
                    );
                }
            }
        }
        return `{${lines.join(",\n")}}`;
    }

    async function writeTypes(root: string, cols: Record<string, Collection>) {
        const outDir = join(root, ".sprinkles", "content-layer");
        await mkdir(outDir, { recursive: true });

        const collectionInfos: Record<string, { schema: unknown }> = {};
        for (const [name, collection] of Object.entries(cols)) {
            collectionInfos[name] = { schema: collection.schema };
        }
        const configRelPath = relative(outDir, resolve(root, configPath)).replace(/\\/g, "/");
        const types = generateTypes(
            collectionInfos as Record<string, { schema: never }>,
            configRelPath,
        );
        await writeFile(join(outDir, "content.d.ts"), types);
    }

    /** Invalidates all content virtual modules across all Vite environments (client, ssr, rsc). */
    function invalidateContentModules(server: ViteDevServer, entryKeys?: string[]) {
        const moduleIds = [RESOLVED_VIRTUAL_ID, RESOLVED_STORE_ID];
        if (entryKeys) {
            for (const key of entryKeys) {
                moduleIds.push(`${VIRTUAL_ENTRY_PREFIX}${key}.mdx`);
            }
        }

        for (const env of Object.values(server.environments)) {
            for (const id of moduleIds) {
                const mod = env.moduleGraph.getModuleById(id);
                if (mod) {
                    env.moduleGraph.invalidateModule(mod);
                }
            }
        }
    }

    /** Handles a content-related file event during development. */
    async function handleContentChange(server: ViteDevServer, filePath: string) {
        const resolvedPath = resolve(filePath);
        if (!isContentPath(resolvedPath)) {
            return;
        }

        // Collect entry keys that existed before reload for module invalidation
        const previousEntryKeys: string[] = [];
        const mappings = entryFilePaths.get(resolvedPath);
        if (mappings) {
            for (const m of mappings) {
                previousEntryKeys.push(`${m.collection}/${m.id}`);
            }
        }

        let loadedCollections: Record<string, Collection>;
        try {
            loadedCollections = await loadConfig(config.root);
        } catch (error) {
            config.logger.error(
                `[content-layer] Failed to load content config:\n${error instanceof Error ? error.message : String(error)}`,
            );
            return;
        }

        // Always update types when config is valid
        await writeTypes(config.root, loadedCollections);

        try {
            await runLoaders(config.root, loadedCollections, server);
        } catch (error) {
            config.logger.error(
                `[content-layer] ${error instanceof Error ? error.message : String(error)}`,
            );
            // Keep previous valid content state
            return;
        }

        // Collect new entry keys for the changed file
        const newMappings = entryFilePaths.get(resolvedPath);
        const entryKeys = [...previousEntryKeys];
        if (newMappings) {
            for (const m of newMappings) {
                const key = `${m.collection}/${m.id}`;
                if (!entryKeys.includes(key)) {
                    entryKeys.push(key);
                }
            }
        }

        invalidateContentModules(server, entryKeys);
        server.hot.send({ type: "full-reload" });
    }

    return {
        async buildStart() {
            // Load config first — types only depend on schemas, not content data
            let loadedCollections: Record<string, Collection>;
            try {
                loadedCollections = await loadConfig(config.root);
            } catch (error) {
                if (config.command === "build") throw error;
                config.logger.error(
                    `[content-layer] Failed to load content config:\n${error instanceof Error ? error.message : String(error)}`,
                );
                return;
            }

            // Always write types when config is valid
            await writeTypes(config.root, loadedCollections);

            // Then load content data (loaders may fail independently)
            try {
                await runLoaders(config.root, loadedCollections);
            } catch (error) {
                if (config.command === "build") throw error;
                config.logger.error(
                    `[content-layer] Failed to load content:\n${error instanceof Error ? error.message : String(error)}`,
                );
            }
        },

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            // Register a Node.js resolve hook so native import() can handle sprinkles: imports.
            // This is needed because loadConfig uses native import() which bypasses Vite's plugin pipeline.
            let hookPath = resolve(config.root, "content-layer/resolve-hook.js");
            register(pathToFileURL(hookPath));
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

        name: "sprinkles-content-layer",

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
    };
}
