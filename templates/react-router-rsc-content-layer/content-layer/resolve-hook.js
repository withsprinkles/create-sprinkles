import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolve config.ts relative to this hook file (same directory)
const configUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "config.ts")).href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier === "sprinkles:content") {
        return { shortCircuit: true, url: configUrl };
    }
    return nextResolve(specifier, context);
}
