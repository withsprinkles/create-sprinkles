import { z } from "zod";

const kind = z
    .enum(["react-router-spa", "react-router-ssr", "react-router-rsc", "ts-package"])
    .describe("project kind");

const options = {
    cli: z.boolean().describe("Include a CLI scaffold? (ts-package only)").default(false),
    contentLayer: z
        .boolean()
        .describe("Include the content-layer plugin? (react-router-rsc only)")
        .default(false),
    convex: z
        .boolean()
        .describe("Include Convex backend? (react-router-spa and react-router-ssr only)")
        .default(false),
    generator: z
        .boolean()
        .describe("Include a Bingo generator scaffold? (ts-package only)")
        .default(false),
    kind,
    owner: z.string().describe("GitHub owner or organization"),
    repository: z.string().describe("repository name"),
    sea: z
        .boolean()
        .describe("Include a Single Executable Application scaffold? (ts-package only)")
        .default(false),
};

export { kind, options };
