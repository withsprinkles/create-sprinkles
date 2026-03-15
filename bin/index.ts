#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import { runTemplate } from "bingo";
import path from "node:path";

import template from "../src/template.ts"; // resolved to dist/index.mjs at build time

prompts.intro("@withsprinkles/workbench");

const directory = await prompts.text({
    message: "Where should we create the project?",
    placeholder: "./my-project",
    validate: value => {
        if (!value) {return "Directory is required";}
    },
});

if (prompts.isCancel(directory)) {process.exit(0);}

const kind = await prompts.select({
    message: "What kind of project?",
    options: [
        { label: "React Router — SPA", value: "react-router-spa" as const },
        { label: "React Router — SSR", value: "react-router-ssr" as const },
        { label: "React Router — RSC", value: "react-router-rsc" as const },
        { label: "TypeScript Package", value: "ts-package" as const },
    ],
});

if (prompts.isCancel(kind)) {process.exit(0);}

let convex = false;
let contentLayer = false;
let cli = false;
let generator = false;
let sea = false;

if (kind === "react-router-spa" || kind === "react-router-ssr") {
    const answer = await prompts.confirm({
        initialValue: false,
        message: "Include Convex backend?",
    });
    if (prompts.isCancel(answer)) {process.exit(0);}
    convex = answer;
}

if (kind === "react-router-rsc") {
    const answer = await prompts.confirm({
        initialValue: false,
        message: "Include content-layer plugin?",
    });
    if (prompts.isCancel(answer)) {process.exit(0);}
    contentLayer = answer;
}

if (kind === "ts-package") {
    const features = await prompts.multiselect({
        message: "Include optional features?",
        options: [
            { label: "CLI scaffold", value: "cli" as const },
            { label: "Bingo generator scaffold", value: "generator" as const },
            { label: "Single Executable Application (SEA)", value: "sea" as const },
        ],
        required: false,
    });
    if (prompts.isCancel(features)) {process.exit(0);}
    cli = features.includes("cli");
    generator = features.includes("generator");
    sea = features.includes("sea");
}

const resolvedDir = path.resolve(directory);
const repository = path.basename(resolvedDir);

const owner = await prompts.text({
    message: "GitHub owner or organization?",
    placeholder: "my-org",
    validate: value => {
        if (!value) {return "Owner is required";}
    },
});

if (prompts.isCancel(owner)) {process.exit(0);}

const spinner = prompts.spinner();
spinner.start("Scaffolding project...");

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
