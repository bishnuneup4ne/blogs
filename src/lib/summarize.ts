import type { Block } from "./types";

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Deterministic extractive summary from the article's own text — no invented facts. */
export function blocksToSpeech(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "p":
      case "quote":
        parts.push(stripTags(block.html));
        break;
      case "h2":
      case "h3":
        parts.push(block.text);
        break;
      case "list":
        parts.push(block.items.map(stripTags).join(". "));
        break;
      case "callout":
        parts.push(stripTags(block.html));
        break;
      case "table":
        parts.push(`${block.head.join(", ")}. ${block.rows.map((r) => r.join(", ")).join(". ")}`);
        break;
      case "chart": {
        if (block.chart.kind === "flow") {
          const labels = block.chart.nodes?.length
            ? block.chart.nodes.map((node) => node.label)
            : block.chart.steps ?? [];
          parts.push(`${block.chart.title ?? "Flow"}. ${labels.join(", then ")}.`);
        } else {
          parts.push(`${block.chart.title ?? "Chart"}.`);
        }
        break;
      }
      default:
        break;
    }
  }
  return parts.filter(Boolean).join(" ");
}
