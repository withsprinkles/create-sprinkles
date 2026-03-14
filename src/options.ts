import { z } from "zod";

const kind = z
    .enum(["react-router-spa", "react-router-ssr", "react-router-rsc", "ts-package"])
    .describe("Project kind");

const options = {
    cli: z.boolean().default(false).describe("Include CLI scaffold (ts-package only)"),
    generator: z
        .boolean()
        .default(false)
        .describe("Include Bingo generator scaffold (ts-package only)"),
    kind,
    owner: z.string().describe("GitHub owner or organization"),
    repository: z.string().describe("Repository name"),
    sea: z
        .boolean()
        .default(false)
        .describe("Include Single Executable Application scaffold (ts-package only)"),
};

export { kind, options };
