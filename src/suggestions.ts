import type { TemplateContext } from "./context.ts";

export function buildSuggestions(context: TemplateContext): string[] {
    const suggestions: string[] = [];

    if (context.hasConvex) {
        suggestions.push("Open the Convex dashboard: https://dashboard.convex.dev");
    }

    if ((context.isSSR || context.isRSC) && !context.hasSEA) {
        suggestions.push("Log in to Cloudflare: vpx wrangler login");
    }

    if (context.hasSEA) {
        suggestions.push("Build the executable: vp run build");
    }

    if (context.isReactRouter) {
        suggestions.push("Start the dev server: vp dev");
    } else {
        suggestions.push("Start development: vp run dev");
    }

    return suggestions;
}
