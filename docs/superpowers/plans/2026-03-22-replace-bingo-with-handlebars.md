# Replace Bingo with Plain Handlebars — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 4-package Bingo framework and replace it with the `handlebars` npm package plus ~80 lines of utility code, with native binary file support.

**Architecture:** New utility modules (`types.ts`, `render.ts`, `write.ts`, `exec.ts`) replace Bingo's framework. The `produce()` function becomes a plain async function. `bin/index.ts` calls `produce()` → `writeTree()` → `runScripts()` directly. Binary files (like `favicon.ico`) are handled natively via null-byte detection.

**Tech Stack:** TypeScript, Handlebars, Node.js `fs`, `child_process`

**Spec:** `docs/superpowers/specs/2026-03-22-replace-bingo-with-handlebars-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types.ts` | Create | `FileTree`, `Script`, `Creation` type definitions |
| `src/render.ts` | Create | Compile `.hbs` templates, read binary/text files from template dirs |
| `src/write.ts` | Create | Write a `FileTree` to disk recursively |
| `src/exec.ts` | Create | Run `Script[]` in phased order |
| `src/template.ts` | Modify | Replace Bingo wrapper with plain `produce()` function |
| `src/merge.ts` | Modify | Swap `CreatedDirectory` type for `FileTree` |
| `src/scripts.ts` | Modify | Swap `CreatedScript` type for `Script`, remove favicon workaround |
| `src/index.ts` | Modify | Update exports |
| `bin/index.ts` | Modify | Replace `runTemplate` with direct `produce`/`writeTree`/`runScripts` calls |
| `tests/index.test.ts` | Modify | Replace `testTemplate` with direct `produce()` calls |
| `templates/react-shared/public/favicon.ico` | Create (move) | Binary favicon, moved from `assets/` |
| `assets/favicon.ico` | Delete | No longer needed |
| `package.json` | Modify | Swap dependencies, remove `"assets"` from `files` |

---

### Task 1: Swap dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Bingo packages and add Handlebars**

```bash
vp remove bingo bingo-fs bingo-handlebars
vp remove -D bingo-testers
vp add handlebars
```

Note: `handlebars` ships its own TypeScript declarations — no `@types/handlebars` needed.

- [ ] **Step 2: Verify install succeeded**

Run: `vp install`
Expected: Clean install, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace bingo packages with handlebars"
```

---

### Task 2: Create `src/types.ts`

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the types file**

```ts
export type FileTree = Record<string, string | Buffer | FileTree>;

export interface Script {
    commands: string[];
    phase: number;
    silent?: boolean;
}

export interface Creation {
    files: FileTree;
    scripts: Script[];
    suggestions: string[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `vp run typecheck`
Expected: No new errors from `src/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add local FileTree, Script, and Creation types"
```

---

### Task 3: Create `src/render.ts`

**Files:**
- Create: `src/render.ts`

- [ ] **Step 1: Create the render module**

```ts
import type { FileTree } from "./types.ts";

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

- [ ] **Step 2: Verify it compiles**

Run: `vp run typecheck`
Expected: No new errors from `src/render.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/render.ts
git commit -m "feat: add renderTemplates for Handlebars template rendering with binary support"
```

---

### Task 4: Create `src/write.ts`

**Files:**
- Create: `src/write.ts`

- [ ] **Step 1: Create the write module**

```ts
import type { FileTree } from "./types.ts";

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

- [ ] **Step 2: Verify it compiles**

Run: `vp run typecheck`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/write.ts
git commit -m "feat: add writeTree for writing FileTree to disk"
```

---

### Task 5: Create `src/exec.ts`

**Files:**
- Create: `src/exec.ts`

- [ ] **Step 1: Create the exec module**

```ts
import type { Script } from "./types.ts";

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

- [ ] **Step 2: Verify it compiles**

Run: `vp run typecheck`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/exec.ts
git commit -m "feat: add runScripts for phased script execution"
```

---

### Task 6: Move favicon and remove `assets/`

**Files:**
- Create: `templates/react-shared/public/favicon.ico` (binary move)
- Delete: `assets/favicon.ico`
- Delete: `assets/` directory
- Modify: `package.json` (`files` field)

- [ ] **Step 1: Move the favicon into the template tree**

```bash
mkdir -p templates/react-shared/public
cp assets/favicon.ico templates/react-shared/public/favicon.ico
rm -rf assets
```

- [ ] **Step 2: Update `package.json` `files` field**

In `package.json`, change the `files` array from:

```json
"files": [
    "assets",
    "dist",
    "templates"
],
```

to:

```json
"files": [
    "dist",
    "templates"
],
```

- [ ] **Step 3: Commit**

```bash
git add templates/react-shared/public/favicon.ico package.json
git rm -r assets
git commit -m "refactor: move favicon.ico into react-shared template layer, remove assets/"
```

---

### Task 7: Migrate `src/merge.ts`, `src/scripts.ts`, and `src/template.ts`

These three files are migrated together because they have type dependencies — changing `merge.ts` alone would break `template.ts` until it is also updated.

**Files:**
- Modify: `src/merge.ts`
- Modify: `src/scripts.ts`
- Modify: `src/template.ts` (full rewrite)

#### Part A: Migrate `src/merge.ts`

- [ ] **Step 1: Replace the type import**

Change:

```ts
import type { CreatedDirectory } from "bingo-fs";
```

to:

```ts
import type { FileTree } from "./types.ts";
```

- [ ] **Step 2: Replace `CreatedDirectory` with `FileTree` throughout the file**

Replace all occurrences of `CreatedDirectory` with `FileTree` in `src/merge.ts`. There are 4 occurrences: the import (already changed), the `isDirectory` type guard return type (line 3), the `mergeFiles` parameter type (line 7), and the `result` variable type (line 8).

- [ ] **Step 3: Add `Buffer` exclusion to `isDirectory` type guard**

The `isDirectory` function must exclude `Buffer` values, since `Buffer` is also a non-null, non-array object. Without this, merging two layers that both contain the same binary file path would produce garbage instead of a clean override.

Change:

```ts
function isDirectory(value: unknown): value is FileTree {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

to:

```ts
function isDirectory(value: unknown): value is FileTree {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !Buffer.isBuffer(value);
}
```

#### Part B: Migrate `src/scripts.ts`

- [ ] **Step 4: Replace the type import**

Change:

```ts
import type { CreatedScript } from "bingo";
```

to:

```ts
import type { Script } from "./types.ts";
```

- [ ] **Step 5: Remove favicon-related code**

Remove the `readFileSync` and `path` imports (lines 3-4):

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
```

Remove the `faviconBase64` constant (lines 8-10):

```ts
const faviconBase64 = readFileSync(
    path.join(import.meta.dirname, "../assets/favicon.ico"),
).toString("base64");
```

Remove the phase 3 favicon script block (lines 104-113):

```ts
    // Phase 3.5: Write binary assets that bingo-handlebars can't handle
    if (context.isReactRouter) {
        scripts.push({
            commands: [
                "mkdir -p public",
                `echo '${faviconBase64}' | base64 -d > public/favicon.ico`,
            ],
            phase: 3,
        });
    }
```

- [ ] **Step 6: Replace `CreatedScript` with `Script` in the return type**

Change the return type of `buildScripts` from `CreatedScript[]` to `Script[]`.

#### Part C: Migrate `src/template.ts`

This is the core migration. Replace the Bingo-based template with a plain `produce()` function.

- [ ] **Step 7: Rewrite `src/template.ts`**

Replace the entire file contents with:

```ts
import type { TemplateContext } from "./context.ts";
import type { Creation, FileTree } from "./types.ts";

import path from "node:path";

import { buildContext } from "./context.ts";
import { mergeFiles } from "./merge.ts";
import { renderTemplates } from "./render.ts";
import { buildScripts } from "./scripts.ts";
import { buildSuggestions } from "./suggestions.ts";

type Options = Parameters<typeof buildContext>[0];

let templatesDir = path.join(import.meta.dirname, "../templates");

let kindDirectories: Record<string, string> = {
    "react-router-rsc": "react-router-rsc",
    "react-router-spa": "react-router-spa",
    "react-router-ssr": "react-router-ssr",
    "ts-package": "ts-package",
};

async function collectAddonLayers(context: TemplateContext): Promise<(FileTree | null)[]> {
    let addons: (FileTree | null)[] = [];

    if (context.isPackage && context.cli) {
        addons.push(await renderTemplates(path.join(templatesDir, "ts-package-cli"), context));
    }

    if (context.isPackage && context.generator) {
        addons.push(await renderTemplates(path.join(templatesDir, "ts-package-generator"), context));
    }

    if (context.isPackage && context.sea) {
        addons.push(await renderTemplates(path.join(templatesDir, "ts-package-sea"), context));
    }

    if (context.hasConvex) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-convex"), context));
    }

    if (context.isSSR && context.hasConvex) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-ssr-convex"), context));
    }

    if (context.isRSC && !context.hasSEA) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-rsc-cloudflare"), context));
    }

    if (context.hasSEA) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-rsc-sea"), context));
    }

    if (context.hasContentLayer) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-rsc-content-layer"), context));
    }

    return addons;
}

async function buildLayers(context: TemplateContext): Promise<FileTree> {
    let shared = await renderTemplates(path.join(templatesDir, "shared"), context);

    let reactShared: FileTree | null = null;

    if (context.isReactRouter) {
        reactShared = await renderTemplates(path.join(templatesDir, "react-shared"), context);
    }

    let kindDir = kindDirectories[context.kind];
    let kindSpecific: FileTree | null = null;

    if (kindDir) {
        kindSpecific = await renderTemplates(path.join(templatesDir, kindDir), context);
    }

    let addons = await collectAddonLayers(context);

    return mergeFiles(shared, reactShared, kindSpecific, ...addons);
}

export async function produce(options: Options): Promise<Creation> {
    let context = buildContext(options);
    let files = await buildLayers(context);
    let scripts = buildScripts(context);
    let suggestions = buildSuggestions(context);
    return { files, scripts, suggestions };
}
```

- [ ] **Step 8: Verify all three files compile**

Run: `vp run typecheck`
Expected: No new errors. All three files should compile cleanly together.

- [ ] **Step 9: Commit**

```bash
git add src/merge.ts src/scripts.ts src/template.ts
git commit -m "refactor: migrate merge.ts, scripts.ts, and template.ts off Bingo"
```

---

### Task 8: Migrate `src/index.ts`


**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update exports**

Replace the entire file contents with:

```ts
export { produce } from "./template.ts";
export { options } from "./options.ts";
export { buildContext } from "./context.ts";
export type { TemplateContext } from "./context.ts";
export type { Creation, FileTree, Script } from "./types.ts";
```

- [ ] **Step 2: Verify it compiles**

Run: `vp run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "refactor: update public exports — produce replaces template"
```

---

### Task 9: Migrate `bin/index.ts`

**Files:**
- Modify: `bin/index.ts`

- [ ] **Step 1: Replace Bingo imports and runtime call**

Replace the imports at the top (lines 1-4):

```ts
#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import { runTemplate } from "bingo";
import path from "node:path";

import { NAME } from "../src/metadata.ts";
import template from "../src/template.ts";
```

with:

```ts
#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import path from "node:path";

import { runScripts } from "../src/exec.ts";
import { NAME } from "../src/metadata.ts";
import { produce } from "../src/template.ts";
import { writeTree } from "../src/write.ts";
```

- [ ] **Step 2: Replace the scaffolding block**

Replace the try/catch block at the bottom (lines 110-137):

```ts
try {
    const creation = await runTemplate(template, {
        directory: resolvedDir,
        mode: "setup",
        options: {
            cli,
            contentLayer,
            convex,
            generator,
            kind,
            owner,
            repository,
            sea,
        },
    });

    spinner.stop("Project scaffolded!");

    if (creation.suggestions?.length) {
        prompts.note(creation.suggestions.join("\n"), "Next steps");
    }

    prompts.outro(`Created ${repository} at ${resolvedDir}`);
} catch (error) {
    spinner.stop("Failed to scaffold project");
    prompts.log.error(String(error));
    process.exit(1);
}
```

with:

```ts
try {
    let creation = await produce({ cli, contentLayer, convex, generator, kind, owner, repository, sea });
    await writeTree(resolvedDir, creation.files);
    runScripts(creation.scripts, resolvedDir);

    spinner.stop("Project scaffolded!");

    if (creation.suggestions.length) {
        prompts.note(creation.suggestions.join("\n"), "Next steps");
    }

    prompts.outro(`Created ${repository} at ${resolvedDir}`);
} catch (error) {
    spinner.stop("Failed to scaffold project");
    prompts.log.error(String(error));
    process.exit(1);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `vp run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add bin/index.ts
git commit -m "refactor: replace runTemplate with direct produce/writeTree/runScripts calls"
```

---

### Task 10: Migrate tests

**Files:**
- Modify: `tests/index.test.ts`

- [ ] **Step 1: Replace imports**

Replace:

```ts
import { testTemplate } from "bingo-testers";
import { describe, expect, it } from "vite-plus/test";

import { buildContext } from "../src/context.ts";
import { mergeFiles } from "../src/merge.ts";
import { options } from "../src/options.ts";
import { buildScripts } from "../src/scripts.ts";
import { buildSuggestions } from "../src/suggestions.ts";
import template from "../src/template.ts";
```

with:

```ts
import { describe, expect, it } from "vite-plus/test";

import { buildContext } from "../src/context.ts";
import { mergeFiles } from "../src/merge.ts";
import { options } from "../src/options.ts";
import { buildScripts } from "../src/scripts.ts";
import { buildSuggestions } from "../src/suggestions.ts";
import { produce } from "../src/template.ts";
```

- [ ] **Step 2: Replace all `testTemplate` calls with `produce` calls**

In the "template snapshots" describe block, replace every instance of:

```ts
const creation = await testTemplate(template, {
    options: {
        ...
    },
});
```

with:

```ts
let creation = await produce({
    cli: false,
    contentLayer: false,
    convex: false,
    generator: false,
    sea: false,
    ...
});
```

Note: The boolean options (`cli`, `contentLayer`, `convex`, `generator`, `sea`) are technically optional in the type system (Zod `.optional()`), but explicitly providing `false` for each in tests is clearer. `kind`, `owner`, and `repository` are required.

The full list of test calls to update:

1. "SPA kind (no Convex)" — add `cli: false, contentLayer: false, convex: false, generator: false, sea: false`
2. "SPA kind (with Convex)" — add `cli: false, contentLayer: false, generator: false, sea: false`
3. "SSR kind (no Convex)" — add `cli: false, contentLayer: false, convex: false, generator: false, sea: false`
4. "SSR kind (with Convex)" — add `cli: false, contentLayer: false, generator: false, sea: false`
5. "RSC kind (no content-layer)" — add `cli: false, contentLayer: false, convex: false, generator: false, sea: false`
6. "RSC kind (with content-layer)" — add `cli: false, convex: false, generator: false, sea: false`
7. "RSC kind (with SEA)" — add `cli: false, contentLayer: false, convex: false, generator: false`
8. "RSC kind (with content-layer + SEA)" — add `cli: false, convex: false, generator: false`
9. "React Router templates include react-shared layer files" — add all missing boolean options
10. "ts-package base" — add `cli: false, contentLayer: false, convex: false, generator: false, sea: false`
11-17. All "ts-package feature combinations" — add missing booleans similarly

- [ ] **Step 3: Clean up dead type guard code**

In the `buildScripts` describe block, find the type guard around line 640:

```ts
const depScript = scripts.find(
    (script): script is Exclude<typeof script, string> =>
        typeof script !== "string" &&
        script.phase === 0 &&
        Array.isArray(script.commands) &&
        script.commands.length > 1,
);
```

Replace with:

```ts
let depScript = scripts.find(
    script => script.phase === 0 && script.commands.length > 1,
);
```

- [ ] **Step 4: Replace favicon script tests with favicon file tree tests**

The two favicon script tests (lines 511-555) will fail because the favicon base64 script was removed in Task 7. Replace them.

Delete the test "React Router templates include favicon script" and replace with:

```ts
it("React Router templates include favicon in file tree", async () => {
    for (let kind of ["react-router-spa", "react-router-ssr", "react-router-rsc"] as const) {
        let creation = await produce({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind,
            owner: "test-owner",
            repository: "test-repo",
            sea: false,
        });
        let files = creation.files as Record<string, unknown>;
        let pub = files.public as Record<string, unknown>;

        expect(Buffer.isBuffer(pub["favicon.ico"]), `${kind}: favicon.ico should be a Buffer`).toBe(
            true,
        );
    }
});
```

Delete the test "ts-package does not include favicon script" and replace with:

```ts
it("ts-package does not include favicon", async () => {
    let creation = await produce({
        cli: false,
        contentLayer: false,
        convex: false,
        generator: false,
        kind: "ts-package",
        owner: "test-owner",
        repository: "test-repo",
        sea: false,
    });
    let files = creation.files as Record<string, unknown>;

    expect(files.public).toBeUndefined();
});
```

- [ ] **Step 5: Delete old snapshots and regenerate**

```bash
rm tests/__snapshots__/index.test.ts.snap
vp test -- -u
```

Expected: All tests pass and snapshots are regenerated.

- [ ] **Step 6: Verify all tests pass**

Run: `vp test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/index.test.ts tests/__snapshots__/index.test.ts.snap
git commit -m "test: migrate tests from bingo-testers to direct produce() calls"
```

---

### Task 11: Run quality gates

- [ ] **Step 1: Run typecheck**

Run: `vp run typecheck`
Expected: No errors.

- [ ] **Step 2: Run linter**

Run: `vp lint`
Expected: No errors. If there are warnings about unused imports from deleted Bingo packages, they should have been caught in earlier tasks.

- [ ] **Step 3: Run formatter**

Run: `vp fmt`
Expected: All files formatted.

- [ ] **Step 4: Run full test suite**

Run: `vp test`
Expected: All tests pass.

- [ ] **Step 5: Run full check**

Run: `vp check`
Expected: Clean.

- [ ] **Step 6: Commit any formatting changes**

```bash
git add -A
git commit -m "style: format after migration"
```

(Skip if no changes.)

---

### Task 12: Verify no Bingo references remain

- [ ] **Step 1: Search for Bingo imports**

Search source files (excluding `node_modules/`, `docs/`, `pnpm-lock.yaml`) for any remaining references to `bingo`:

```bash
grep -r "bingo" --include="*.ts" --include="*.json" --exclude-dir=node_modules --exclude-dir=docs --exclude=pnpm-lock.yaml .
```

Expected: No matches in source files. `package.json` should have zero bingo references.

- [ ] **Step 2: Verify node_modules is clean**

```bash
ls node_modules/.bin/bingo 2>/dev/null && echo "FAIL: bingo binary still present" || echo "OK: no bingo binary"
```

Expected: "OK: no bingo binary"

- [ ] **Step 3: Commit if any stragglers were found and fixed**

---

### Task 13: Version bump

- [ ] **Step 1: Bump to v0.4.0**

This is a breaking change (public API changed: `template` export replaced with `produce`). Bump the minor version since we're pre-1.0:

```bash
npm version minor --no-git-tag-version
```

Expected: Version in `package.json` changes to `0.4.0`.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: bump to v0.4.0 for breaking API change"
```
