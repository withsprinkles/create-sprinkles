import path from "node:path";

import type { TemplateContext } from "./context.ts";
import type { Creation, FileTree } from "./types.ts";

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
        addons.push(
            await renderTemplates(path.join(templatesDir, "ts-package-generator"), context),
        );
    }

    if (context.isPackage && context.sea) {
        addons.push(await renderTemplates(path.join(templatesDir, "ts-package-sea"), context));
    }

    if (context.hasConvex) {
        addons.push(await renderTemplates(path.join(templatesDir, "react-router-convex"), context));
    }

    if (context.isSSR && context.hasConvex) {
        addons.push(
            await renderTemplates(path.join(templatesDir, "react-router-ssr-convex"), context),
        );
    }

    if (context.isRSC && !context.hasSEA) {
        addons.push(
            await renderTemplates(path.join(templatesDir, "react-router-rsc-cloudflare"), context),
        );
    }

    if (context.hasSEA) {
        addons.push(
            await renderTemplates(path.join(templatesDir, "react-router-rsc-sea"), context),
        );
    }

    if (context.hasContentLayer) {
        addons.push(
            await renderTemplates(
                path.join(templatesDir, "react-router-rsc-content-layer"),
                context,
            ),
        );
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
