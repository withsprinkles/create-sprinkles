import type { CreatedDirectory } from "bingo-fs";

import { createTemplate } from "bingo";
import { handlebars } from "bingo-handlebars";
import path from "node:path";

import type { TemplateContext } from "./context.ts";

import { buildContext } from "./context.ts";
import { mergeFiles } from "./merge.ts";
import { NAME } from "./metadata.ts";
import { options } from "./options.ts";
import { buildScripts } from "./scripts.ts";
import { buildSuggestions } from "./suggestions.ts";

const templatesDir = path.join(import.meta.dirname, "../templates");

const kindDirectories: Record<string, string> = {
    "react-router-rsc": "react-router-rsc",
    "react-router-spa": "react-router-spa",
    "react-router-ssr": "react-router-ssr",
    "ts-package": "ts-package",
};

async function tryHandlebars(
    dir: string,
    context: TemplateContext,
): Promise<CreatedDirectory | null> {
    try {
        const result = await handlebars(path.join(templatesDir, dir), context as never);
        return (result as CreatedDirectory) || null;
    } catch {
        return null;
    }
}

async function collectAddonLayers(context: TemplateContext): Promise<(CreatedDirectory | null)[]> {
    const addons: (CreatedDirectory | null)[] = [];

    if (context.isPackage && context.cli) {
        addons.push(await tryHandlebars("ts-package-cli", context));
    }

    if (context.isPackage && context.generator) {
        addons.push(await tryHandlebars("ts-package-generator", context));
    }

    if (context.isPackage && context.sea) {
        addons.push(await tryHandlebars("ts-package-sea", context));
    }

    if (context.hasConvex) {
        addons.push(await tryHandlebars("react-router-convex", context));
    }

    if (context.isSSR && context.hasConvex) {
        addons.push(await tryHandlebars("react-router-ssr-convex", context));
    }

    if (context.isRSC && !context.hasSEA) {
        addons.push(await tryHandlebars("react-router-rsc-cloudflare", context));
    }

    if (context.hasSEA) {
        addons.push(await tryHandlebars("react-router-rsc-sea", context));
    }

    if (context.hasContentLayer) {
        addons.push(await tryHandlebars("react-router-rsc-content-layer", context));
    }

    return addons;
}

async function buildLayers(context: TemplateContext): Promise<CreatedDirectory> {
    const shared = await tryHandlebars("shared", context);

    let reactShared: CreatedDirectory | null = null;

    if (context.isReactRouter) {
        reactShared = await tryHandlebars("react-shared", context);
    }

    const kindDir = kindDirectories[context.kind];
    let kindSpecific: CreatedDirectory | null = null;

    if (kindDir) {
        kindSpecific = await tryHandlebars(kindDir, context);
    }

    const addons = await collectAddonLayers(context);

    return mergeFiles(shared, reactShared, kindSpecific, ...addons);
}

export default createTemplate({
    about: {
        description: "Get started with development by creating projects from templates quickly.",
        name: NAME,
    },

    options,

    async produce({ options: opts }) {
        const context = buildContext(opts as never);
        const files = await buildLayers(context);

        const scripts = buildScripts(context);
        const suggestions = buildSuggestions(context);

        return { files, scripts, suggestions };
    },
});
