import type { CreatedScript } from "bingo";

import type { TemplateContext } from "./context.ts";

function buildDependencyCommands(context: TemplateContext): string[] {
    const commands: string[] = [];

    // Non-vite-plus dev dependencies first
    commands.push("vp add -D @types/node @typescript/native-preview");

    if (context.isReactRouter) {
        commands.push("vp add react react-dom react-router");
        commands.push(
            "vp add -D @types/react @types/react-dom @react-router/dev @tailwindcss/vite tailwindcss vite-plugin-devtools-json",
        );
        commands.push("vp add -D @rolldown/plugin-babel @vitejs/plugin-react");
        commands.push("vp add -D @cloudflare/vite-plugin wrangler");
        // Lint plugins referenced in vite.config.ts jsPlugins
        commands.push("vp add -D eslint-plugin-perfectionist eslint-plugin-react-hooks");
    }

    if (context.isReactRouter) {
        // @react-router/node + isbot required by the vite plugin to resolve server
        // Runtime. Without isbot, the plugin runs `npm install` which fails on pnpm.
        commands.push("vp add @react-router/node isbot");
    }

    if (context.hasConvex) {
        commands.push("vp add convex @convex-dev/react-query @tanstack/react-query");
    }

    if (context.isRSC) {
        commands.push("vp add -D @vitejs/plugin-rsc");
    }

    if (context.hasContentLayer) {
        commands.push("vp add jsr:@std/jsonc jsr:@std/yaml gray-matter github-slugger @remix-run/data-schema");
        commands.push("vp add -D @mdx-js/rollup");
    }

    if (context.isPackage) {
        if (context.cli) {
            commands.push("vp add @bomb.sh/args");
        }

        if (context.generator) {
            commands.push("vp add bingo bingo-handlebars zod");
        }
    }

    // Vite-plus MUST be installed last: the vite-plus npm package ships a
    // Node_modules/.bin/vp shim that only supports a subset of commands (no
    // `add`).  execa's preferLocal option (default true for tagged templates)
    // Causes that shim to shadow the global vp binary, so every subsequent
    // `vp add` would fail with "Command 'add' not found".
    commands.push(
        "vp add -D vite-plus vite@npm:@voidzero-dev/vite-plus-core@latest vitest@npm:@voidzero-dev/vite-plus-test@latest",
    );

    return commands;
}

export function buildScripts(context: TemplateContext): CreatedScript[] {
    const scripts: CreatedScript[] = [];

    // Phase 0: Install all dependencies (single entry = sequential execution)
    const phase0Commands = [...buildDependencyCommands(context), "vp install"];
    scripts.push({ commands: phase0Commands, phase: 0 });

    // Phase 1: Generate Cloudflare types that vp check needs
    if (context.isRSC) {
        scripts.push({ commands: ["vpx wrangler types -c wrangler.rsc.jsonc"], phase: 1 });
    } else if (context.isSSR) {
        scripts.push({ commands: ["vpx wrangler types"], phase: 1 });
    }

    // Phase 2: Format generated code (skip lint/typecheck — virtual module
    // types like sprinkles:content don't exist until the first `vp dev` run)
    scripts.push({ commands: ["vp fmt"], phase: 2 });

    // Phase 3: Kind-specific setup
    if (context.hasConvex) {
        scripts.push({ commands: ["vpx convex dev --once"], phase: 3, silent: true });
    }

    // Phase 4: Symlinks and git init
    scripts.push({
        commands: ["ln -sf AGENTS.md CLAUDE.md", "git init", "git add -A", "git commit -m initial"],
        phase: 4,
    });

    return scripts;
}
