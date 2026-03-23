import { execFileSync } from "node:child_process";

import type { Script } from "./types.ts";

export function runScripts(scripts: Script[], cwd: string): void {
    let phases = [...new Set(scripts.map(s => s.phase))].sort((a, b) => a - b);

    for (let phase of phases) {
        let batch = scripts.filter(s => s.phase === phase);

        for (let script of batch) {
            for (let command of script.commands) {
                try {
                    execFileSync("/bin/sh", ["-c", command], { cwd, stdio: "pipe" });
                } catch (error) {
                    if (!script.silent) throw error;
                }
            }
        }
    }
}
