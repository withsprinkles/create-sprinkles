import type { CreatedScript } from "bingo";

import type { TemplateContext } from "./context.ts";

function buildDependencyCommands(context: TemplateContext): string[] {
    const commands: string[] = [];

    if (context.isReactRouter) {
        commands.push("vp add react react-dom react-router");
        commands.push("vp add -D @react-router/dev @tailwindcss/vite tailwindcss");
        commands.push("vp add -D @rolldown/plugin-babel @vitejs/plugin-react");
    }

    if (context.hasConvex) {
        commands.push("vp add convex @convex-dev/react-query @tanstack/react-query");
    }

    if (context.isSPA) {
        commands.push("vp add -D @cloudflare/vite-plugin wrangler");
    }

    if (context.isSSR) {
        commands.push("vp add @react-router/node isbot");
        commands.push("vp add -D @cloudflare/vite-plugin wrangler");
    }

    if (context.isRSC) {
        commands.push("vp add @std/jsonc @std/yaml gray-matter github-slugger");
        commands.push(
            "vp add -D @vitejs/plugin-rsc @cloudflare/vite-plugin @mdx-js/rollup wrangler",
        );
    }

    if (context.isPackage) {
        commands.push("vp add -D vite-plus @types/node");

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

    if (depCommands.length > 0) {
        scripts.push({ commands: depCommands, phase: 0 });
    }

    scripts.push({ commands: ["vp install"], phase: 0 });

    // Phase 1: Format and lint fix
    scripts.push({ commands: ["vp check --fix"], phase: 1, silent: true });

    // Phase 2: Kind-specific setup
    if (context.hasConvex) {
        scripts.push({ commands: ["vp dlx convex dev --once"], phase: 2, silent: true });
    }

    if (context.isRSC) {
        scripts.push({ commands: ["vp dlx wrangler types"], phase: 2, silent: true });
    }

    // Phase 3: Initialize git repository
    scripts.push({
        commands: ["git init", "git add -A", 'git commit -m "Initial commit"'],
        phase: 3,
    });

    return scripts;
}
