import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";

function isValidMermaidCode(source: string): boolean {
  const text = source.trim();
  if (!text || text.length === 0) return false;

  const firstLine = text.split("\n")[0]?.trim() || "";
  if (!firstLine) return false;

  // All valid mermaid diagram types (case-insensitive)
  const validDiagramTypes = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "pie",
    "gantt",
    "gitGraph",
    "requirementDiagram",
    "mindmap",
    "timeline",
    "C4Context",
    "C4Container",
    "C4Component",
    "C4Dynamic",
    "C4Deployment",
  ];

  // Check if starts with valid diagram type
  const startsWithValid = validDiagramTypes.some(type => 
    firstLine.toLowerCase().startsWith(type.toLowerCase())
  );

  if (!startsWithValid) {
    console.warn(`Invalid Mermaid diagram type: "${firstLine}". Valid types: ${validDiagramTypes.join(", ")}`);
    return false;
  }

  return true;
}

/** ```mermaid blocks → <MermaidChart chart="..." /> */
export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, "code", (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (!node.lang || node.lang.toLowerCase() !== "mermaid") return;

      const chart = (node.value ?? "").replace(/\r\n/g, "\n").trim();
      if (!isValidMermaidCode(chart)) return;

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "MermaidChart",
        attributes: [
          { type: "mdxJsxAttribute", name: "chart", value: chart },
        ],
        children: [],
      } satisfies MdxJsxFlowElement;
    });
  };
}
