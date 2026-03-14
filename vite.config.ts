import { defineConfig } from "vite-plus";

export default defineConfig({
    fmt: {
        arrowParens: "avoid",
        ignore: ["**/*.hbs"],
        overrides: [
            {
                files: ["**/*.jsonc"],
                options: {
                    trailingComma: "none",
                },
            },
            {
                files: ["**/.vscode/**"],
                options: {
                    trailingComma: "all",
                },
            },
        ],
        sortImports: {
            groups: [
                "type-import",
                ["value-builtin", "value-external"],
                "type-internal",
                "value-internal",
                ["type-parent", "type-sibling", "type-index"],
                ["value-parent", "value-sibling", "value-index"],
                "unknown",
            ],
            partitionByComment: true,
        },
        tabWidth: 4,
    },
    lint: {
        categories: {
            correctness: "error",
            nursery: "warn",
            pedantic: "warn",
            perf: "error",
            restriction: "error",
            style: "warn",
            suspicious: "error",
        },
        env: {
            node: true,
        },
        options: {
            typeAware: true,
            typeCheck: true,
        },
        plugins: ["jsdoc", "import", "node", "promise", "vitest"],
        rules: {
            "eslint/default-param-last": "error",
            "eslint/func-style": ["error", "declaration"],
            "eslint/no-cond-assign": "off",
            "eslint/no-dupe-else-if": "error",
            "eslint/no-else-return": "error",
            "eslint/no-empty-pattern": "warn",
            "eslint/no-irregular-whitespace": "error",
            "eslint/no-lonely-if": "warn",
            "eslint/no-param-reassign": "error",
            "eslint/no-template-curly-in-string": "warn",
            "eslint/no-unused-expressions": "error",
            "eslint/no-useless-escape": "warn",

            "import/extensions": [
                "error",
                "ignorePackages",
                {
                    cjs: "always",
                    cts: "always",
                    js: "always",
                    jsx: "always",
                    mjs: "always",
                    mts: "always",
                    ts: "always",
                    tsx: "always",
                },
            ],
            "import/no-commonjs": "warn",
            "import/no-default-export": "off",
            "import/no-named-export": "off",
            "import/no-relative-parent-imports": "off",
            "import/prefer-default-export": "off",

            "typescript/consistent-type-imports": "error",
            "typescript/no-empty-interface": "warn",
            "typescript/no-explicit-any": "warn",
            "typescript/no-inferrable-types": "error",
            "typescript/no-non-null-assertion": "warn",
            "typescript/prefer-as-const": "error",
            "typescript/prefer-enum-initializers": "error",

            "unicorn/no-lonely-if": "warn",
            "unicorn/prefer-at": "warn",
            "unicorn/prefer-string-slice": "warn",
            "unicorn/prefer-string-trim-start-end": "error",
        },
        settings: {
            vitest: {
                typecheck: true,
            },
        },
    },
    pack: {
        dts: {
            tsgo: true,
        },
        exports: true,
    },
    run: {
        tasks: {
            build: { command: "vp pack" },
            dev: { command: "vp pack --watch" },
            typecheck: { command: "tsgo --noEmit" },
        },
    },
});
