import type { CreatedScript } from "bingo";

import type { TemplateContext } from "./context.ts";

export function buildScripts(context: TemplateContext): CreatedScript[] {
    const scripts: CreatedScript[] = [];

    // Phase 0: Install dependencies
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
