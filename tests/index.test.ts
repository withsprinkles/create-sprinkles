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
    it("SPA kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-spa",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("SSR kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-ssr",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("RSC kind", async () => {
        const creation = await testTemplate(template, {
            options: {
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
    it("SPA: isReactRouter, hasConvex, isSPA", () => {
        const ctx = buildContext({
            cli: false,
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
    });

    it("SSR: isReactRouter, hasConvex, isSSR", () => {
        const ctx = buildContext({
            cli: false,
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

    it("RSC: isReactRouter, no Convex, isRSC", () => {
        const ctx = buildContext({
            cli: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isRSC).toBe(true);
        expect(ctx.isReactRouter).toBe(true);
        expect(ctx.hasConvex).toBe(false);
    });

    it("ts-package: isPackage, not isReactRouter, no Convex", () => {
        const ctx = buildContext({
            cli: true,
            generator: false,
            kind: "ts-package",
            owner: "o",
            repository: "r",
            sea: false,
        });

        expect(ctx.isPackage).toBe(true);
        expect(ctx.isReactRouter).toBe(false);
        expect(ctx.hasConvex).toBe(false);
        expect(ctx.cli).toBe(true);
    });
});

// ── Scripts ─────────────────────────────────────────────────────────────────

describe("buildScripts", () => {
    it("SPA: includes install, check, convex, git init", () => {
        const ctx = buildContext({
            cli: false,
            generator: false,
            kind: "react-router-spa",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toContainEqual({ commands: ["vp install"], phase: 0 });
        expect(scripts).toContainEqual({ commands: ["vp check --fix"], phase: 1, silent: true });
        expect(scripts).toContainEqual({
            commands: ["vp dlx convex dev --once"],
            phase: 2,
            silent: true,
        });
        expect(scripts).toContainEqual({
            commands: ["git init", "git add -A", 'git commit -m "Initial commit"'],
            phase: 3,
        });
    });

    it("RSC: includes wrangler types, no convex", () => {
        const ctx = buildContext({
            cli: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toContainEqual({
            commands: ["vp dlx wrangler types"],
            phase: 2,
            silent: true,
        });
        expect(scripts).not.toContainEqual(
            expect.objectContaining({ commands: ["vp dlx convex dev --once"] }),
        );
    });

    it("ts-package: only install, check, git init", () => {
        const ctx = buildContext({
            cli: false,
            generator: false,
            kind: "ts-package",
            owner: "o",
            repository: "r",
            sea: false,
        });
        const scripts = buildScripts(ctx);

        expect(scripts).toHaveLength(3);
    });
});

// ── Suggestions ─────────────────────────────────────────────────────────────

describe("buildSuggestions", () => {
    it("SPA: Convex dashboard + vp dev", () => {
        const ctx = buildContext({
            cli: false,
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

    it("RSC: wrangler login + vp dev", () => {
        const ctx = buildContext({
            cli: false,
            generator: false,
            kind: "react-router-rsc",
            owner: "o",
            repository: "r",
            sea: false,
        });

        const suggestions = buildSuggestions(ctx);

        expect(suggestions).toContain("Log in to Cloudflare: vp dlx wrangler login");
        expect(suggestions).toContain("Start the dev server: vp dev");
    });

    it("ts-package: vp run dev", () => {
        const ctx = buildContext({
            cli: false,
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
