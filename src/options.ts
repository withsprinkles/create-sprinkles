import { z } from "zod";

const kind = z
    .enum(["react-router-spa", "react-router-ssr", "react-router-rsc", "ts-package"])
    .describe("project kind");

const options = {
    cli: z.boolean().optional(),
    contentLayer: z.boolean().optional(),
    convex: z.boolean().optional(),
    generator: z.boolean().optional(),
    kind,
    owner: z.string().describe("GitHub owner or organization"),
    repository: z.string().describe("repository name"),
    sea: z.boolean().optional(),
};

export { kind, options };
