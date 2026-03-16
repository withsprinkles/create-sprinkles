import { testTemplate } from "bingo-testers";
import { describe, expect, it } from "vite-plus/test";

import { buildContext } from "../src/context.ts";
import { mergeFiles } from "../src/merge.ts";
import { options } from "../src/options.ts";
import { buildScripts } from "../src/scripts.ts";
import { buildSuggestions } from "../src/suggestions.ts";
import template from "../src/template.ts";

// ── Snapshot tests for all 4 kinds ─────────────────────────────────────────

describe("template snapshots", () => {
    it("SPA kind (no Convex)", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-spa",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("SPA kind (with Convex)", async () => {
        const creation = await testTemplate(template, {
            options: {
                convex: true,
                kind: "react-router-spa",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("SSR kind (no Convex)", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-ssr",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("SSR kind (with Convex)", async () => {
        const creation = await testTemplate(template, {
            options: {
                convex: true,
                kind: "react-router-ssr",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("RSC kind (no content-layer)", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-rsc",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("RSC kind (with content-layer)", async () => {
        const creation = await testTemplate(template, {
            options: {
                contentLayer: true,
                kind: "react-router-rsc",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("ts-package base", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });
});

// ── TS package feature combination snapshots ────────────────────────────────

describe("ts-package feature combinations", () => {
    it("cli only", async () => {
        const creation = await testTemplate(template, {
            options: {
                cli: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("generator only", async () => {
        const creation = await testTemplate(template, {
            options: {
                generator: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("sea only", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
                sea: true,
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("cli + generator", async () => {
        const creation = await testTemplate(template, {
            options: {
                cli: true,
                generator: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("cli + sea", async () => {
        const creation = await testTemplate(template, {
            options: {
                cli: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
                sea: true,
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("generator + sea", async () => {
        const creation = await testTemplate(template, {
            options: {
                generator: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
                sea: true,
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("cli + generator + sea", async () => {
        const creation = await testTemplate(template, {
            options: {
                cli: true,
                generator: true,
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
                sea: true,
            },
        });

        expect(creation.files).toMatchSnapshot();
    });
});

// ── Options ─────────────────────────────────────────────────────────────────

describe("options", () => {
    it("exports all expected option keys", () => {
        expect(Object.keys(options).sort()).toEqual([
            "cli",
            "contentLayer",
            "convex",
            "generator",
            "kind",
            "owner",
            "repository",
            "sea",
        ]);
    });
});

// ── Context builder ─────────────────────────────────────────────────────────

describe("buildContext", () => {
    it("SPA with Convex: isReactRouter, hasConvex, isSPA", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: true,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isSPA).toBe(true);
        expect(ctx.isSSR).toBe(false);
        expect(ctx.isRSC).toBe(false);
        expect(ctx.isPackage).toBe(false);
        expect(ctx.isReactRouter).toBe(true);
        expect(ctx.hasConvex).toBe(true);
        expect(ctx.hasContentLayer).toBe(false);
    });

    it("SPA without Convex: no hasConvex", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isSPA).toBe(true);
        expect(ctx.hasConvex).toBe(false);
    });

    it("SSR with Convex: isReactRouter, hasConvex, isSSR", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: true,
            generator: false,
            kind: "react-router-ssr",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isSSR).toBe(true);
        expect(ctx.isReactRouter).toBe(true);
        expect(ctx.hasConvex).toBe(true);
    });

    it("RSC with content-layer: hasContentLayer", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: true,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isRSC).toBe(true);
        expect(ctx.isReactRouter).toBe(true);
        expect(ctx.hasConvex).toBe(false);
        expect(ctx.hasContentLayer).toBe(true);
    });

    it("RSC without content-layer: no hasContentLayer", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isRSC).toBe(true);
        expect(ctx.hasContentLayer).toBe(false);
    });

    it("ts-package: isPackage, not isReactRouter, no Convex", () => {
        const ctx = buildContext({
            cli: true,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "ts-package",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isPackage).toBe(true);
        expect(ctx.isReactRouter).toBe(false);
        expect(ctx.hasConvex).toBe(false);
        expect(ctx.hasContentLayer).toBe(false);
        expect(ctx.cli).toBe(true);
    });

    it("Convex ignored for non-SPA/SSR kinds", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: true,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.hasConvex).toBe(false);
    });

    it("contentLayer ignored for non-RSC kinds", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: true,
            convex: false,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.hasContentLayer).toBe(false);
    });
});

// ── Scripts ─────────────────────────────────────────────────────────────────

describe("buildScripts", () => {
    it("all templates get vite-plus in deps", () => {
        for (const kind of [
            "react-router-spa",
            "react-router-ssr",
            "react-router-rsc",
            "ts-package",
        ] as const) {
            const ctx = buildContext({
                cli: false,
                contentLayer: false,
                convex: false,
                generator: false,
                kind,
                owner: "o",
                repository: "r",
                sea: false,
            });
            const scripts = buildScripts(ctx);

            expect(scripts).toContainEqual(
                expect.objectContaining({
                    commands: expect.arrayContaining([
                        expect.stringContaining("vp add -D vite-plus"),
                    ]),
                    phase: 0,
                }),
            );
        }
    });

    it("SPA with Convex: includes vpx convex dev", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: true,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toContainEqual({
            commands: ["vpx convex dev --once"],
            phase: 3,
            silent: true,
        });
    });

    it("SPA without Convex: no convex script", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).not.toContainEqual(
            expect.objectContaining({ commands: ["vpx convex dev --once"] }),
        );
    });

    it("RSC: runs wrangler typegen before check", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toContainEqual({
            commands: ["vpx wrangler types -c wrangler.rsc.jsonc"],
            phase: 1,
        });
    });

    it("RSC with content-layer: includes content-layer deps", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: true,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toContainEqual(
            expect.objectContaining({
                commands: expect.arrayContaining([
                    "vp add jsr:@std/jsonc jsr:@std/yaml gray-matter github-slugger @remix-run/data-schema",
                ]),
                phase: 0,
            }),
        );
    });

    it("RSC without content-layer: no content-layer deps", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        const depScript = scripts.find(
            (script): script is Exclude<typeof script, string> =>
                typeof script !== "string" &&
                script.phase === 0 &&
                Array.isArray(script.commands) &&
                script.commands.length > 1,
        );
        const allCommands = depScript?.commands.join(" ") ?? "";

        expect(allCommands).not.toContain("gray-matter");
        expect(allCommands).not.toContain("@mdx-js/rollup");
    });
});

// ── Suggestions ─────────────────────────────────────────────────────────────

describe("buildSuggestions", () => {
    it("SPA with Convex: Convex dashboard + vp dev", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: true,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });

        const suggestions = buildSuggestions(ctx);

        expect(suggestions).toContain("Open the Convex dashboard: https://dashboard.convex.dev");
        expect(suggestions).toContain("Start the dev server: vp dev");
    });

    it("RSC: vpx wrangler login + vp dev", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        const suggestions = buildSuggestions(ctx);

        expect(suggestions).toContain("Log in to Cloudflare: vpx wrangler login");
        expect(suggestions).toContain("Start the dev server: vp dev");
    });

    it("ts-package: vp run dev", () => {
        const ctx = buildContext({
            cli: false,
            contentLayer: false,
            convex: false,
            generator: false,
            kind: "ts-package",
            owner: "o",
            repository: "r",
            sea: false,
        });

        const suggestions = buildSuggestions(ctx);

        expect(suggestions).toContain("Start development: vp run dev");
        expect(suggestions).not.toContain("Start the dev server: vp dev");
    });
});

// ── Merge utility ───────────────────────────────────────────────────────────

describe("mergeFiles", () => {
    it("deep merges nested directories", () => {
        const result = mergeFiles({ src: { "a.ts": "a" } }, { src: { "b.ts": "b" } });

        expect(result).toEqual({
            src: { "a.ts": "a", "b.ts": "b" },
        });
    });

    it("later layers override earlier ones", () => {
        const result = mergeFiles({ "file.ts": "old" }, { "file.ts": "new" });

        expect(result).toEqual({ "file.ts": "new" });
    });

    it("skips null layers", () => {
        const result = mergeFiles({ "a.ts": "a" }, null, { "b.ts": "b" });

        expect(result).toEqual({ "a.ts": "a", "b.ts": "b" });
    });
});
