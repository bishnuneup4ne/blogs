import type { Root } from "hast";

export function parseStyleString(style: unknown): Record<string, string> | undefined {
  if (!style) return undefined;
  if (typeof style === "object" && !Array.isArray(style)) {
    return style as Record<string, string>;
  }

  const raw = Array.isArray(style) ? style.filter((v) => typeof v === "string").join("; ") : style;
  if (typeof raw !== "string") return undefined;

  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!key || !value) continue;
    const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

type TreeNode = {
  type?: string;
  properties?: Record<string, unknown>;
  attributes?: Array<{ type?: string; name?: string; value?: unknown }>;
  children?: TreeNode[];
};

function fixElementStyle(node: TreeNode) {
  if (node.type === "element" && node.properties && typeof node.properties.style === "string") {
    node.properties.style = parseStyleString(node.properties.style);
  }
}

function walk(node: TreeNode) {
  fixElementStyle(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child);
  }
}

/** Convert HTML `style="..."` on HAST/MDX nodes to React style objects before JSX render. */
export function rehypeParseInlineStyle() {
  return (tree: Root) => {
    walk(tree as TreeNode);
  };
}
