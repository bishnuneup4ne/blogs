import type { Root } from "mdast";
import { parseStyleString } from "./rehypeParseInlineStyle";

type MdastNode = {
  type?: string;
  attributes?: Array<{ type?: string; name?: string; value?: unknown }>;
  children?: MdastNode[];
};

function fixMdxStyleAttribute(attr: { type?: string; name?: string; value?: unknown }) {
  if (attr.name !== "style" || typeof attr.value !== "string") return;

  const parsed = parseStyleString(attr.value);
  if (!parsed) return;

  attr.type = "mdxJsxAttributeValueExpression";
  attr.value = Object.entries(parsed)
    .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
    .join(", ");
}

function walkMdast(node: MdastNode) {
  if (
    (node.type === "mdxJsxTextElement" || node.type === "mdxJsxFlowElement") &&
    Array.isArray(node.attributes)
  ) {
    for (const attr of node.attributes) {
      if (attr.type === "mdxJsxAttribute") {
        fixMdxStyleAttribute(attr);
      }
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkMdast(child);
    }
  }
}

/** Convert MDX JSX `style="..."` attributes to expression objects before compile. */
export function remarkParseInlineStyle() {
  return (tree: Root) => {
    walkMdast(tree as MdastNode);
  };
}
