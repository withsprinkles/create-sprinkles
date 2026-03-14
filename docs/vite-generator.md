I dug through the current Vite+ starter and the underlying Bingo docs.

The precise answer is:

A **Vite+ generator**, in the form produced by `vp create vite:generator`, is a **Bingo template package with its own CLI**. The generated starter’s `package.json` depends on `bingo` and `zod`, its `bin/index.ts` calls `runTemplateCLI(template)`, and its `src/template.ts` exports `createTemplate(...)`. The starter README also explicitly says to customize `src/template.ts` and points you to the Bingo template docs. ([GitHub][1])

That is slightly narrower than “anything `vp create` can run.” `vp create` can invoke built-in templates, package-based templates such as `create-vite`, local templates such as `./tools/create-ui-component`, and remote GitHub templates. But the specific thing Vite+ scaffolds when you choose `vite:generator` is a Bingo-based generator package. ([Vite+][2])

## What you actually write

You write two main pieces:

1. a **template definition** with `createTemplate(...)`
2. a **CLI entrypoint** that passes that template to `runTemplateCLI(...)` ([Bingo][3])

In Bingo’s model, a template defines:

- **options** as Zod schemas
- a **producer** function that turns those options into a repository/file creation plan ([Bingo][4])

The producer returns a **Creation** object. A Creation can contain:

- `files`: files/directories to write
- `requests`: API calls to make
- `scripts`: shell commands to run after files are written
- `suggestions`: next-step tips shown to the user ([Bingo][5])

Bingo also has two execution modes:

- **setup**: create a new repository/project
- **transition**: migrate an existing repository/project

If needed, you can add mode-specific logic with `setup()` and `transition()`. ([Bingo][6])

## How `vp create` fits in

`vp create` passes arguments after `--` through to the selected template, so your Bingo template’s options become the meaningful flags/prompts for the generator. Vite+’s docs show that forwarding behavior explicitly, and Bingo’s CLI docs say template-defined options become CLI flags and missing required ones are prompted for interactively. ([Vite+][2])

So a locally-authored generator in a Vite+ monorepo would look conceptually like this:

```bash
vp create ./tools/create-ui-component -- --name Button --kind component
```

That matches Vite+’s documented support for local templates such as `./tools/create-ui-component`. ([Vite+][2])

## Minimal shape of a real generator

This is the core structure, adapted to how the Vite+ starter is wired:

```ts
// src/template.ts
import { createTemplate } from "bingo";
import { z } from "zod";

export default createTemplate({
    about: {
        name: "create-ui-component",
        description: "Scaffold a UI component in this workspace",
    },

    options: {
        name: z.string().describe("Component name"),
        kind: z.enum(["component", "hook"]).default("component"),
    },

    async produce({ options }) {
        const baseDir =
            options.kind === "component" ? `src/components/${options.name}` : `src/hooks`;

        return {
            files: {
                [baseDir]:
                    options.kind === "component"
                        ? {
                              [`${options.name}.tsx`]: `
export function ${options.name}() {
  return <div>${options.name}</div>;
}
`.trim(),
                              [`${options.name}.test.tsx`]: `
import { describe, it, expect } from "vitest";

describe("${options.name}", () => {
  it("works", () => {
    expect(true).toBe(true);
  });
});
`.trim(),
                          }
                        : {
                              [`use${options.name}.ts`]: `
export function use${options.name}() {
  return {};
}
`.trim(),
                          },
            },

            suggestions: [`Review the generated files for ${options.name}.`],
        };
    },
});
```

```ts
// bin/index.ts
#!/usr/bin/env node
import { runTemplateCLI } from "bingo";
import template from "../src/template.ts";

process.exitCode = await runTemplateCLI(template);
```

```json
{
    "name": "create-ui-component",
    "type": "module",
    "bin": "./bin/index.ts",
    "dependencies": {
        "bingo": "^0.7.0",
        "zod": "^3.25.76"
    }
}
```

That structure is not guesswork; it is the same pattern used by the current Vite+ generator starter: `package.json` with `bingo` + `zod`, `bin/index.ts` calling `runTemplateCLI`, and `src/template.ts` exporting `createTemplate(...)`. ([GitHub][1])

## What the starter is already telling you to customize

The built-in `vite:generator` starter is intentionally minimal. Its README says to edit `src/template.ts` to customize:

- the **options schema**
- the **file generation logic**
- the **scripts and suggestions** ([GitHub][7])

Its generated `src/template.ts` already shows the exact extension points:

- `about`
- `options`
- `produce({ options })`
- returned `files`
- returned `scripts`
- returned `suggestions` ([GitHub][8])

## The practical authoring model

In practice, authoring a Vite+ generator means:

- define the **inputs** you want with Zod
- generate the output tree in `files`
- optionally run install/format/fix commands in `scripts`
- optionally show manual follow-up steps in `suggestions`
- optionally add `setup()` / `transition()` when you need different behavior for new vs existing projects ([Bingo][4])

For larger generators, Bingo explicitly recommends moving beyond one giant `produce()` function and using a templating engine such as **Handlebars** or **Stratum**. Handlebars is suggested for straightforward templates with more than a handful of files; Stratum is suggested for richer logic and preset-driven templates. ([Bingo][4])

## Bottom line

So the exact mental model is:

- **`vp create`** is the Vite+ command that launches templates/generators. ([Vite+][2])
- A **generator created by `vite:generator`** is a **Bingo template package**. ([GitHub][1])
- You author it by writing a **Bingo template** with `createTemplate(...)`, exposing it through a small **CLI wrapper** with `runTemplateCLI(...)`, and letting `vp create ... -- <flags>` feed options into it. ([Bingo][3])

A concise example invocation in a workspace would be:

```bash
vp create ./tools/create-ui-component -- --name Button --kind component
```

That is the direct, concrete way to go beyond “scaffold the generator” and actually implement one.

[1]: https://raw.githubusercontent.com/voidzero-dev/vite-plus/main/packages/cli/templates/generator/package.json "raw.githubusercontent.com"
[2]: https://viteplus.dev/guide/create "Creating a Project | The Unified Toolchain for the Web"
[3]: https://create.bingo/blog/your-first-bingo-template/ "Your First Bingo Template | Bingo"
[4]: https://www.create.bingo/build/concepts/templates "Templates | Bingo"
[5]: https://create.bingo/build/concepts/creations "Creations | Bingo"
[6]: https://create.bingo/build/concepts/modes "Modes | Bingo"
[7]: https://github.com/voidzero-dev/vite-plus/tree/main/packages/cli/templates/generator "vite-plus/packages/cli/templates/generator at main · voidzero-dev/vite-plus · GitHub"
[8]: https://raw.githubusercontent.com/voidzero-dev/vite-plus/main/packages/cli/templates/generator/src/template.ts "raw.githubusercontent.com"
