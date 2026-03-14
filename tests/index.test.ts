import { testTemplate } from "bingo-testers";
import { describe, expect, it } from "vite-plus/test";

import { buildContext } from "../src/context.ts";
import { options } from "../src/options.ts";
import template from "../src/template.ts";

describe("template", () => {
    it("produces an empty creation for SPA kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "react-router-spa",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toEqual({});
    });

    it("produces an empty creation for ts-package kind", async () => {
        const creation = await testTemplate(template, {
            options: {
                kind: "ts-package",
                owner: "test-owner",
                repository: "test-repo",
            },
        });

        expect(creation.files).toEqual({});
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
