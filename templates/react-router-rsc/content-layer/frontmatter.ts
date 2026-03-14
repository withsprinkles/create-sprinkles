import { parse as parseYaml } from "@std/yaml";

export interface FrontmatterResult {
    data: Record<string, unknown>;
    body: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): FrontmatterResult {
    const match = FRONTMATTER_RE.exec(content);
    if (!match) {
        return { body: content, data: {} };
    }
    const raw = match[1];
    const body = content.slice(match[0].length).replace(/^\r?\n/, "");
    const data = parseYaml(raw) as Record<string, unknown>;
    return { body, data };
}
