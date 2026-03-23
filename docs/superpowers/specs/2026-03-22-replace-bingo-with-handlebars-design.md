# Replace Bingo with Plain Handlebars

## Problem

The project uses 4 Bingo packages (`bingo`, `bingo-fs`, `bingo-handlebars`, `bingo-testers`) that add framework overhead without proportional benefit:

- `bingo-handlebars` is unreliable — requires silent `try/catch` wrappers, `as never` casts, and can't handle binary files (favicon workaround in scripts)
- `bingo`'s `createTemplate`/`runTemplate` framework adds complexity for a straightforward use case — the actual UX is handled by `@clack/prompts`
- 4 extra dependencies with version churn and maintenance burden
- `bingo-testers` is only needed because `bingo` wraps `produce()` in an opaque template object

## Approach

Replace the entire Bingo ecosystem with the `handlebars` npm package and ~80 lines of utility code. Keep all existing `.hbs` templates unchanged.

## New Modules

### `src/types.ts` — Local type definitions

```ts
// Nested file tree: keys are file/folder names, values are contents or subdirectories
export type FileTree = Record<string, string | Buffer | FileTree>;

// Script execution descriptor
export interface Script {
  commands: string[];
  phase: number;
  silent?: boolean;
}

// What produce() returns
export interface Creation {
  files: FileTree;
  scripts: Script[];
  suggestions: string[];
}
```

Simplifications vs Bingo:
- `FileTree` drops `false`, `undefined`, tuple, and metadata variants (unused)
- `FileTree` adds `Buffer` support for binary files — something `bingo-handlebars` couldn't handle
- `Script` is always an object with required `phase` (no bare string form)
- No generic type parameters or Zod schema wiring

### `src/render.ts` — Template rendering (replaces `bingo-handlebars`)

```ts
import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";

function isBinary(buffer: Buffer): boolean {
  return buffer.includes(0);
}

export async function renderTemplates(dir: string, context: object): Promise<FileTree> {
  let tree: FileTree = {};

  for (let entry of await fs.readdir(dir, { withFileTypes: true })) {
    let fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      tree[entry.name] = await renderTemplates(fullPath, context);
    } else if (entry.name.endsWith(".hbs")) {
      let source = await fs.readFile(fullPath, "utf-8");
      tree[entry.name.slice(0, -4)] = Handlebars.compile(source)(context);
    } else {
      let buffer = await fs.readFile(fullPath);
      tree[entry.name] = isBinary(buffer) ? buffer : buffer.toString("utf-8");
    }
  }

  return tree;
}
```

- Walks a template directory recursively
- `.hbs` files are compiled with Handlebars and stripped of the extension
- Non-`.hbs` files are detected as binary (contains null bytes) or text
- Binary files are stored as `Buffer`, text files as `string`
- Errors surface naturally (no silent `try/catch`)

### `src/write.ts` — File writing (replaces `runTemplate`'s write behavior)

```ts
import fs from "node:fs/promises";
import path from "node:path";

export async function writeTree(dir: string, tree: FileTree): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  for (let [name, entry] of Object.entries(tree)) {
    let target = path.join(dir, name);

    if (typeof entry === "string" || Buffer.isBuffer(entry)) {
      await fs.writeFile(target, entry);
    } else {
      await writeTree(target, entry);
    }
  }
}
```

### `src/exec.ts` — Script execution (replaces `runTemplate`'s script runner)

Uses `execFileSync` from `node:child_process` for safe command execution. Each command string is split into the program and its arguments to avoid shell injection. Commands that require shell features (pipes, redirects, `&&` chains) use an explicit shell invocation.

```ts
import { execFileSync } from "node:child_process";

export function runScripts(scripts: Script[], cwd: string): void {
  let phases = [...new Set(scripts.map(s => s.phase))].sort((a, b) => a - b);

  for (let phase of phases) {
    let batch = scripts.filter(s => s.phase === phase);

    for (let script of batch) {
      for (let command of script.commands) {
        try {
          execFileSync("/bin/sh", ["-c", command], { cwd, stdio: "pipe" });
        } catch (error) {
          if (!script.silent) throw error;
        }
      }
    }
  }
}
```

- Phases run sequentially in ascending order
- Commands within a script run sequentially
- `silent` scripts swallow errors (used for `convex dev --once`)
- `stdio: "pipe"` keeps output hidden while clack spinner shows progress
- Uses `execFileSync` with explicit `/bin/sh` to avoid shell injection while still supporting shell syntax needed by commands (pipes, `&&`, redirects)

## Changes to Existing Files

### `src/template.ts`

- Remove `createTemplate` wrapper — `produce()` becomes a plain async function
- Remove `tryHandlebars` entirely — replace with direct `renderTemplates` calls. The silent `try/catch` in `tryHandlebars` was a workaround for `bingo-handlebars` unreliability; all template directories are statically known and always exist, so errors should surface naturally.
- `buildLayers` and `collectAddonLayers` stay structurally identical, just calling `renderTemplates` instead of `handlebars()`

```ts
export async function produce(options: Options): Promise<Creation> {
  let context = buildContext(options);
  let files = await buildLayers(context);
  let scripts = buildScripts(context);
  let suggestions = buildSuggestions(context);
  return { files, scripts, suggestions };
}
```

### `bin/index.ts`

- Remove `runTemplate` import
- Call `produce()`, `writeTree()`, `runScripts()` directly:

```ts
let creation = await produce({ cli, contentLayer, convex, generator, kind, owner, repository, sea });
await writeTree(resolvedDir, creation.files);
runScripts(creation.scripts, resolvedDir);
```

- Clack prompts and UX remain unchanged

### `src/index.ts`

- Export `produce` instead of `template` — this is a breaking change to the public API
- Continue exporting `options`, `buildContext`, `TemplateContext`
- Also export `Creation`, `FileTree`, `Script` types for consumers
- This warrants a semver major bump (v1.0.0 or v0.4.0 depending on convention)

### `src/scripts.ts`

- Change `CreatedScript` type import to local `Script` type
- Remove the `faviconBase64` constant and the phase 3 binary asset script (the `mkdir -p public` + `base64 -d > public/favicon.ico` workaround)
- Remove the `readFileSync` and `path` imports if no longer needed

### `src/merge.ts`

- Change `CreatedDirectory` type import to local `FileTree` type
- No logic changes

### `tests/index.test.ts`

- Replace `testTemplate(template, { options })` with direct `produce(options)` calls
- All assertion logic remains identical (same `creation.files` shape)
- Clean up dead type guard code (e.g., `Exclude<typeof script, string>` at line 640) since `Script` is always an object
- Regenerate all snapshots after migration: `vp test -- -u`

## Template File Changes

- Move `assets/favicon.ico` → `templates/react-shared/public/favicon.ico`
- Delete the `assets/` directory entirely
- Update `package.json` `files` field: remove `"assets"` entry

Since `renderTemplates` now handles binary files natively, the favicon is picked up automatically as part of the `react-shared` layer — no special-case scripts needed.

## Dependency Changes

- **Add:** `handlebars`
- **Remove:** `bingo`, `bingo-fs`, `bingo-handlebars`, `bingo-testers`

## What Stays the Same

- All `.hbs` template files — unchanged
- Template context building (`src/context.ts`) — unchanged
- Options schema (`src/options.ts`) — unchanged
- Layer merging logic (`src/merge.ts`) — logic unchanged
- Script building logic (`src/scripts.ts`) — logic unchanged
- Suggestions (`src/suggestions.ts`) — unchanged
- Clack-based CLI UX (`bin/index.ts`) — prompts unchanged

### `bin/index.ts` (additional cleanup)

- `creation.suggestions?.length` can be simplified to `creation.suggestions.length` since `produce()` always returns a non-partial `Creation`

## Notes

- Bingo ran scripts within a phase in parallel, but each phase currently has at most one `Script` object, so sequential execution is simpler and correct. Parallelism can be added later if needed.
- The `mergeFiles` type guard (`!Array.isArray(value)`) becomes slightly redundant since `FileTree` never contains arrays, but it's harmless and not worth changing.
