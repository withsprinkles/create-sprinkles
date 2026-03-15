import type { Schema } from "@remix-run/data-schema";
import type { ComponentType } from "react";
import type { FSWatcher } from "vite-plus";

function todo(): never {
    throw new Error("Not implemented");
}

export interface DataEntry<D extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * An identifier for the entry, which must be unique within the collection. This is used to
     * look up the entry in the store and is the key used with `getEntry` for that collection.
     */
    id: string;
    /**
     * The actual data for the entry. When a user accesses the collection, this will have TypeScript
     * types generated according to the collection schema.
     *
     * It is the loader's responsibility to use `parseData` to validate and parse the data before
     * storing it in the data store: no validation is done when getting or setting the data.
     */
    data: D;
    /**
     * A path to the file that is the source of this entry, relative to the root of the site. This
     * only applies to file-based loaders and is used to resolve paths such as images or other assets.
     *
     * If not set, then any fields in the schema that use the `image()` helper will be treated as
     * public paths and not transformed.
     */
    filePath?: string;
    /**
     * The raw body of the entry, if applicable. If the entry includes rendered content, then this
     * field can be used to store the raw source. This is optional and is not used internally.
     */
    body?: string;
    /**
     * An optional content digest for the entry. This can be used to check if the data has changed.
     *
     * When setting an entry, the entry will only update if the digest does not match an existing
     * entry with the same ID.
     *
     * The format of the digest is up to the loader, but it must be a string that changes when the
     * data changes. This can be done with the `generateDigest` function.
     */
    digest?: string;
    /**
     * Stores an object with an entry's rendered content and metadata if it has been rendered to HTML.
     * For example, this can be used to store the rendered content of a Markdown entry, or HTML from
     * a CMS.
     *
     * If this field is provided, then the `render()` function and `<Content />` component are available
     * to render the entry in a page.
     */
    rendered?: RenderedContent;
}

export interface DataStore<D extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Get an entry from the store by its ID. Returns `undefined` if the entry does not exist.
     *
     * ```ts
     * const existingEntry = store.get("my-entry");
     * ```
     */
    get: (key: string) => DataEntry<D> | undefined;
    /**
     * Used after data has been validated and parsed to add an entry to the store, returning `true`
     * if the entry was set. This returns `false` when the `digest` property determines that an
     * entry has not changed and should not be updated.
     */
    set: (entry: DataEntry) => boolean;
    /**
     * Get all entries in the collection as an array of key-value pairs.
     */
    entries: () => [id: string, DataEntry<D>][];
    /**
     * Get all the keys of the entries in the collection.
     */
    keys: () => string[];
    /**
     * Get all entries in the collection as an array.
     */
    values: () => DataEntry<D>[];
    /**
     * Delete an entry from the store by its ID.
     */
    delete: (key: string) => void;
    /**
     * Clear all entries from the collection.
     */
    clear: () => void;
    /**
     * Check if an entry exists in the store by its ID.
     */
    has: (key: string) => boolean;
}

export interface MetaStore {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    delete: (key: string) => void;
    has: (key: string) => boolean;
}

export interface ParseDataOptions<Data extends Record<string, unknown>> {
    /**
     * The ID of the entry. Unique per collection
     */
    id: string;
    /**
     * The raw, unvalidated data of the entry
     */
    data: Data;
    /**
     * An optional file path, where the entry represents a local file.
     */
    filePath?: string;
}

export interface MarkdownHeading {
    depth: number;
    slug: string;
    text: string;
}

export interface RenderedContent {
    /**
     * Rendered HTML string. If present then `render(entry)` will return a React component
     * that renders this HTML.
     */
    html: string;
    metadata?: {
        /**
         * Any images that are present in this entry. Relative to the DataEntry filePath.
         */
        imagePaths?: string[];
        /**
         * Any headings that are present in this file. Returned as `headings` from `render()`
         */
        headings?: MarkdownHeading[];
        /**
         * Raw frontmatter, parsed from the file. This may include data from remark plugins.
         */
        frontmatter?: Record<string, any>;
        /**
         * Any other metadata that is present in this file.
         */
        [key: string]: unknown;
    };
}

export interface LoaderContext<D extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * The unique name of the collection. This is the key in the collections object in
     * the app/content.config.ts file.
     */
    collection: string;
    /**
     * A database to store the actual data. Use this to update the store with new entries.
     */
    store: DataStore<D>;
    /**
     * A key-value store scoped to the collection, designed for things like sync tokens and
     * last-modified times. This metadata is persisted between builds alongside the collection
     * data but is only available inside the loader.
     *
     * ```ts
     * const lastModified = meta.get("lastModified");
     * // ...
     * meta.set("lastModified", new Date().toISOString());
     * ```
     */
    meta: MetaStore;
    /**
     * Validates and parses the data according to the collection schema. Pass data to this function
     * to validate and parse it before storing it in the data store.
     */
    parseData: <Data extends Record<string, unknown>>(
        props: ParseDataOptions<Data>,
    ) => Promise<Data>;
    /** */
    renderMarkdown: (markdown: string) => Promise<RenderedContent>;
    /**
     * Generates a non-cryptographic content digest of an object or string. This can be used
     * to track if the data has changed by setting the `digest` field of an entry.
     */
    generateDigest: (data: Record<string, unknown> | string) => string;
    /**
     * When running in dev mode, this is a filesystem watcher that can be used to trigger updates.
     */
    watcher: FSWatcher;
}

export interface ContentLoader {
    /**
     * A unique name for the loader, used in logs and for conditional loading.
     */
    name: string;
    /**
     * An async function that is called at build time to load data and update the store.
     */
    load: (context: LoaderContext) => Promise<void> | void;
    /**
     * An optional data schema that defines the shape of the entries.
     * It is used to both validate the data and also to generate TypeScript types for the collection.
     *
     * If a function is provided, it will be called at build time before load() to generate the
     * schema. You can use this to dynamically generate the schema based on the configuration
     * options or by introspecting an API.
     */
    schema:
        | Schema<unknown>
        | Promise<Schema<unknown>>
        | (() => Schema<unknown> | Promise<Schema<unknown>>);
    /**
     * Returns file paths or directories that the loader watches for changes. Used by the content
     * layer plugin to detect new, changed, or deleted content files during development.
     *
     * - File loaders should return the specific file path
     * - Glob loaders should return the base directory
     */
    getWatchedPaths?: () => string[];
}

/**
 * The `context` object that `defineCollection` uses for the function shape of `schema`. This type
 * can be useful when building reusable schemas for multiple collections.
 */
export interface SchemaContext {
    /**
     * The `image()` schema helper that allows you to validate local images in Content Collections
     */
    image: () => Schema<unknown, string>;
}

export interface Collection {
    loader: ContentLoader;
    schema: Schema<unknown> | ((context: SchemaContext) => Schema<unknown>);
}

export function defineCollection<
    S extends Schema<any, any> | ((ctx: SchemaContext) => Schema<any, any>),
>(_input: { loader: ContentLoader; schema: S }): { loader: ContentLoader; schema: S } {
    todo();
}

export function reference(
    _collection: string,
): Schema<string, { collection: ContentEntryMap[keyof ContentEntryMap]; id: string }> {
    todo();
}

// TODO: This should be generated by the Vite plugin based on the schema types of each exported collection
export type ContentEntryMap = {};

type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

export type CollectionKey = keyof ContentEntryMap;
export type CollectionEntry<C extends CollectionKey> = Flatten<ContentEntryMap[C]>;

export function getCollection<C extends keyof ContentEntryMap, E extends CollectionEntry<C>>(
    collection: C,
    filter?: (entry: CollectionEntry<C>) => entry is E,
): Promise<E[]>;
export function getCollection<C extends keyof ContentEntryMap>(
    collection: C,
    filter?: (entry: CollectionEntry<C>) => unknown,
): Promise<CollectionEntry<C>[]>;
export function getCollection<C extends keyof ContentEntryMap, E extends CollectionEntry<C>>(
    _collection: C,
    _filter?: (entry: CollectionEntry<C>) => unknown,
): Promise<E[]> {
    todo();
}

export type ReferenceContentEntry<
    C extends keyof ContentEntryMap,
    E extends ContentEntryMap[C] | (string & {}) = string,
> = {
    collection: C;
    slug: E;
};

export function getEntry<C extends keyof ContentEntryMap, E extends ContentEntryMap[C]>(
    collection: C,
    slug: E,
): Promise<CollectionEntry<C>>;
export function getEntry<C extends keyof ContentEntryMap, E extends ContentEntryMap[C]>(
    entry: ReferenceContentEntry<C, E>,
): Promise<CollectionEntry<C>>;
export function getEntry<C extends keyof ContentEntryMap, E extends ContentEntryMap[C]>(
    _collection: C | ReferenceContentEntry<C, E>,
    _slug?: E,
): Promise<CollectionEntry<C>> {
    todo();
}

export function getEntries<C extends keyof ContentEntryMap, E extends ContentEntryMap[C]>(
    _entries: ReferenceContentEntry<C, E>[],
): Promise<CollectionEntry<C>[]> {
    todo();
}

export interface RenderedEntry {
    Content: ComponentType;
    headings: MarkdownHeading[];
}

export function render<C extends keyof ContentEntryMap>(
    _entry: ContentEntryMap[C][string],
): Promise<RenderedEntry> {
    todo();
}

export interface GenerateIdOptions {
    /** The path to the entry file, relative to the base directory. */
    entry: string;
    /** The base directory URL. */
    base: URL;
    /** The parsed, unvalidated data of the entry. */
    data: Record<string, unknown>;
}

interface GlobOptions {
    /** The glob pattern to match files, relative to the base directory */
    pattern: string | string[];
    /** The base directory to resolve the glob pattern from. Relative to the root directory, or an absolute file URL. Defaults to `.` */
    base?: string | URL;
    /**
     * Function that generates an ID for an entry. Default implementation generates a slug from the entry path.
     * @returns The ID of the entry. Must be unique per collection.
     **/
    generateId?: (options: GenerateIdOptions) => string;
}

export function glob(_globOptions: GlobOptions): ContentLoader {
    todo();
}

interface FileOptions {
    /**
     * The parsing function to use for this data
     * @default jsr:@std/jsonc.parse or jsr:@std/yaml.parse, depending on the extension of the file
     * */
    parser?: (text: string) => Record<string, Record<string, unknown>> | Record<string, unknown>[];
}

export function file(_fileName: string, _options?: FileOptions): ContentLoader {
    todo();
}
