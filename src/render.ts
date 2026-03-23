import type { FileTree } from "./types.ts";

import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";

function isBinary(buffer: Buffer): boolean {
    return buffer.includes(0);
}

export async function renderTemplates(dir: string, context: object): Promise<FileTree> {
    let tree: FileTree = {};

    for (let entry of await fs.readdir(dir, { withFileTypes: true })) {
        let fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            tree[entry.name] = await renderTemplates(fullPath, context);
        } else if (entry.name.endsWith(".hbs")) {
            let source = await fs.readFile(fullPath, "utf-8");
            tree[entry.name.slice(0, -4)] = Handlebars.compile(source)(context);
        } else {
            let buffer = await fs.readFile(fullPath);
            tree[entry.name] = isBinary(buffer) ? buffer : buffer.toString("utf-8");
        }
    }

    return tree;
}
