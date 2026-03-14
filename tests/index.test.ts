import { testTemplate } from "bingo-testers";
import { describe, expect, it } from "vite-plus/test";

import { buildContext } from "../src/context.ts";
import { mergeFiles } from "../src/merge.ts";
import { options } from "../src/options.ts";
import template from "../src/template.ts";

describe("template", () => {
    it("produces shared files for SPA kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-spa",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("produces shared files for ts-package kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("produces shared files for RSC kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-rsc",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });

    it("produces shared files for SSR kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-ssr",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toMatchSnapshot();
    });
});

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

describe("buildContext", () => {
    it("computes derived booleans for SPA", () => {
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

    it("computes derived booleans for ts-package", () => {
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

    it("computes derived booleans for RSC", () => {
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
});

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
