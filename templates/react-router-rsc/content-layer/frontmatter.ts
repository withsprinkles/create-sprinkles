import { parse as parseYaml } from "@std/yaml";

export interface FrontmatterResult {
    data: Record<string, unknown>;
    body: string;
}

let FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): FrontmatterResult {
    let match = FRONTMATTER_RE.exec(content);
    if (!match) {
        return { data: {}, body: content };
    }
    let raw = match[1];
    let body = content.slice(match[0].length).replace(/^\r?\n/, "");
    let data = parseYaml(raw) as Record<string, unknown>;
    return { data, body };
}
