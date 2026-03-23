import type { FileTree } from "./types.ts";

import fs from "node:fs/promises";
import path from "node:path";

export async function writeTree(dir: string, tree: FileTree): Promise<void> {
    await fs.mkdir(dir, { recursive: true });

    for (let [name, entry] of Object.entries(tree)) {
        let target = path.join(dir, name);

        if (typeof entry === "string" || Buffer.isBuffer(entry)) {
            await fs.writeFile(target, entry);
        } else {
            await writeTree(target, entry);
        }
    }
}
