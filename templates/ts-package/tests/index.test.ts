import { describe, expect, it } from "vite-plus/test";

import { greet } from "../src/index.ts";

describe("greet", () => {
    it("should return a greeting", () => {
        expect(greet("world")).toBe("Hello, world!");
    });
});
