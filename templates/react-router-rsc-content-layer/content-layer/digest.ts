import { createHash } from "node:crypto";

export function generateDigest(data: Record<string, unknown> | string): string {
    const input = typeof data === "string" ? data : JSON.stringify(data);
    return createHash("sha256").update(input).digest("hex");
}
