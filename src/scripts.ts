import type { CreatedScript } from "bingo";

import type { TemplateContext } from "./context.ts";

function buildDependencyCommands(context: TemplateContext): string[] {
    const commands: string[] = [];

    // Common dev dependencies for all templates
    commands.push("vp add -D vite-plus @types/node @typescript/native-preview");

    if (context.isReactRouter) {
        commands.push("vp add react react-dom react-router");
        commands.push(
            "vp add -D @react-router/dev @tailwindcss/vite tailwindcss vite-plugin-devtools-json",
        );
        commands.push("vp add -D @rolldown/plugin-babel @vitejs/plugin-react");
        commands.push("vp add -D @cloudflare/vite-plugin wrangler");
    }

    if (context.hasConvex) {
        commands.push("vp add convex @convex-dev/react-query @tanstack/react-query");
    }

    if (context.isSSR) {
        commands.push("vp add @react-router/node isbot");
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

    // Phase 0: Install dependencies
    const depCommands = buildDependencyCommands(context);
    scripts.push({ commands: depCommands, phase: 0 });
    scripts.push({ commands: ["vp install"], phase: 0 });

    // Phase 1: Format and lint fix
    scripts.push({ commands: ["vp check --fix"], phase: 1, silent: true });

    // Phase 2: Kind-specific setup
    if (context.hasConvex) {
        scripts.push({ commands: ["vpx convex dev --once"], phase: 2, silent: true });
    }

    if (context.isRSC) {
        scripts.push({ commands: ["vp run typegen:cloudflare"], phase: 2, silent: true });
    }

    // Phase 3: Symlinks and git init
    scripts.push({
        commands: [
            "ln -sf AGENTS.md CLAUDE.md",
            "git init",
            "git add -A",
            "git commit -m initial",
        ],
        phase: 3,
    });

    return scripts;
}
