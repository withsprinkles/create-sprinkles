import type { CreatedScript } from "bingo";

import type { TemplateContext } from "./context.ts";

function buildDependencyCommands(context: TemplateContext): string[] {
    const commands: string[] = [];

    // Common dev dependencies for all templates
    // Vite must be added as a devDep so the pnpm override maps it to vite-plus-core
    commands.push(
        "vp add -D vite-plus @types/node @typescript/native-preview vite@npm:@voidzero-dev/vite-plus-core@latest vitest@npm:@voidzero-dev/vite-plus-test@latest",
    );

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
        commands.push("vp add @std/jsonc @std/yaml gray-matter github-slugger");
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

    return commands;
}

export function buildScripts(context: TemplateContext): CreatedScript[] {
    const scripts: CreatedScript[] = [];

    // Phase 0: Install all dependencies (single entry = sequential execution)
    const phase0Commands = [...buildDependencyCommands(context), "vp install"];
    scripts.push({ commands: phase0Commands, phase: 0 });

    // Phase 1: Format and lint fix
    scripts.push({ commands: ["vp check --fix"], phase: 1 });

    // Phase 2: Kind-specific setup
    if (context.hasConvex) {
        scripts.push({ commands: ["vpx convex dev --once"], phase: 2, silent: true });
    }

    if (context.isRSC) {
        scripts.push({ commands: ["vp run typegen:cloudflare"], phase: 2, silent: true });
    }

    // Phase 3: Symlinks and git init
    scripts.push({
        commands: ["ln -sf AGENTS.md CLAUDE.md", "git init", "git add -A", "git commit -m initial"],
        phase: 3,
    });

    return scripts;
}
