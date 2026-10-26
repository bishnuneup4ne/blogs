import type { Block, ChartBlock, FlowEdge, FlowNode, FlowNodeShape } from "@/lib/types";

const ALLOWED_TAGS = new Set([
  "a", "p", "br", "strong", "em", "b", "i", "u", "code", "pre", "ul", "ol", "li",
  "blockquote", "h2", "h3", "h4", "span", "img",
]);
const VOID_TAGS = new Set(["br", "img"]);
const DROP_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math", "template",
  "noscript", "textarea", "title", "xmp", "plaintext", "form",
]);
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height", "title"],
};

const MAX_HTML = 200_000;
const MAX_BLOCKS = 300;

interface ParsedTag {
  end: number;
  name: string;
  closing: boolean;
  selfClosing: boolean;
  attrs: [string, string][];
}

function isSpace(char: string): boolean {
  return char === " " || char === "\n" || char === "\t" || char === "\r" || char === "\f";
}

function readTag(html: string, start: number): ParsedTag | null {
  let i = start + 1;
  let closing = false;
  if (html[i] === "/") {
    closing = true;
    i += 1;
  }
  const nameStart = i;
  while (i < html.length && /[a-zA-Z0-9:-]/.test(html[i])) i += 1;
  const name = html.slice(nameStart, i).toLowerCase();
  if (!name || !/^[a-z][a-z0-9:-]*$/.test(name)) return null;

  if (closing) {
    while (isSpace(html[i] ?? "")) i += 1;
    if (html[i] !== ">") return null;
    return { end: i + 1, name, closing: true, selfClosing: false, attrs: [] };
  }

  const attrs: [string, string][] = [];
  while (i < html.length) {
    while (isSpace(html[i] ?? "")) i += 1;
    if (html[i] === ">") return { end: i + 1, name, closing: false, selfClosing: false, attrs };
    if (html[i] === "/" && html[i + 1] === ">") {
      return { end: i + 2, name, closing: false, selfClosing: true, attrs };
    }

    const attrStart = i;
    while (i < html.length && /[a-zA-Z_:][-a-zA-Z0-9_:.]*/.test(html[i])) i += 1;
    if (i === attrStart) return null;
    const attrName = html.slice(attrStart, i).toLowerCase();

    while (isSpace(html[i] ?? "")) i += 1;
    let value = "";
    if (html[i] === "=") {
      i += 1;
      while (isSpace(html[i] ?? "")) i += 1;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        i += 1;
        const valueStart = i;
        while (i < html.length && html[i] !== quote) i += 1;
        if (i >= html.length) return null;
        value = html.slice(valueStart, i);
        i += 1;
      } else {
        const valueStart = i;
        while (i < html.length && !isSpace(html[i]) && html[i] !== ">") i += 1;
        value = html.slice(valueStart, i);
      }
    }
    attrs.push([attrName, value]);
  }
  return null;
}

function escapeText(value: string): string {
  return value.replace(/</g, "&lt;");
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function safeUrl(raw: string, image = false): string | null {
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f\s]/.test(value)) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("https://") || lower.startsWith("http://")) return value;
  if (!image && (lower.startsWith("mailto:") || value.startsWith("#"))) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

function cleanAttrs(tag: string, attrs: [string, string][]): string[] {
  const allowed = ALLOWED_ATTRS[tag] ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [rawName, rawValue] of attrs) {
    if (!allowed.includes(rawName) || seen.has(rawName)) continue;
    seen.add(rawName);
    if (rawName === "href") {
      const href = safeUrl(rawValue);
      if (href) out.push(`href="${escapeAttr(href)}"`);
    } else if (rawName === "src") {
      const src = safeUrl(rawValue, true);
      if (src) out.push(`src="${escapeAttr(src)}"`);
    } else if (rawName === "width" || rawName === "height") {
      const number = Number.parseInt(rawValue, 10);
      if (Number.isFinite(number) && number > 0 && number <= 10_000) out.push(`${rawName}="${number}"`);
    } else {
      out.push(`${rawName}="${escapeAttr(rawValue.slice(0, 600))}"`);
    }
  }
  return out;
}

export function safeImageUrl(value: string): string | null {
  return safeUrl(value, true);
}

export function sanitizeRichText(html: string, maxLength = MAX_HTML): string {
  if (!html) return "";
  const input = html.slice(0, maxLength);
  let out = "";
  let cursor = 0;
  const open: string[] = [];

  const closeTo = (index: number) => {
    for (let i = open.length - 1; i >= index; i -= 1) out += `</${open[i]}>`;
    open.length = index;
  };

  while (cursor < input.length) {
    const lt = input.indexOf("<", cursor);
    if (lt === -1) {
      out += escapeText(input.slice(cursor));
      break;
    }
    out += escapeText(input.slice(cursor, lt));

    if (input.startsWith("<!--", lt)) {
      const end = input.indexOf("-->", lt + 4);
      cursor = end === -1 ? input.length : end + 3;
      continue;
    }

    const tag = readTag(input, lt);
    if (!tag) {
      out += "&lt;";
      cursor = lt + 1;
      continue;
    }

    if (DROP_CONTENT.has(tag.name)) {
      if (tag.closing) {
        cursor = tag.end;
        continue;
      }
      const rest = input.slice(tag.end);
      const close = new RegExp(`</\\s*${tag.name}\\s*>`, "i").exec(rest);
      cursor = close ? tag.end + close.index + close[0].length : input.length;
      continue;
    }

    if (!ALLOWED_TAGS.has(tag.name)) {
      cursor = tag.end;
      continue;
    }

    if (tag.closing) {
      const index = open.lastIndexOf(tag.name);
      if (index !== -1) closeTo(index);
      cursor = tag.end;
      continue;
    }

    const attrs = cleanAttrs(tag.name, tag.attrs);
    const name = tag.name;
    const validImage = name !== "img" || attrs.some((a) => a.startsWith("src="));
    if (validImage) {
      out += `<${name}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
      if (!VOID_TAGS.has(name) && !tag.selfClosing) open.push(name);
      else if (tag.selfClosing && !VOID_TAGS.has(name)) out += `</${name}>`;
    }
    cursor = tag.end;
  }

  closeTo(0);
  return out;
}

function text(value: unknown, max = 20_000): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown, maxItems = 100, maxLength = 2_000): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, maxItems).map((item) => item.slice(0, maxLength))
    : [];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "section";
}

type Datum = { label: string; value: number };
type Series = { name: string; values: number[] };

function chartData(value: unknown): Datum[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ label: String(item.label ?? "").slice(0, 120), value: number(item.value) }))
    .filter((item): item is Datum => typeof item.value === "number")
    .slice(0, 100);
}

function chartSeries(value: unknown): Series[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      name: String(item.name ?? "").slice(0, 120),
      values: Array.isArray(item.values)
        ? item.values.map(number).filter((v): v is number => typeof v === "number").slice(0, 100)
        : [],
    }))
    .filter((item) => item.values.length > 0)
    .slice(0, 20);
}

const FLOW_SHAPES = new Set<FlowNodeShape>([
  "start", "end", "process", "decision", "data", "document", "note",
]);

function flowNodes(value: unknown): FlowNode[] {
  if (!Array.isArray(value)) return [];
  const nodes: FlowNode[] = [];
  const ids = new Set<string>();

  for (const [index, item] of value.slice(0, 40).entries()) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const label = text(source.label, 160);
    if (!label) continue;

    const rawId = text(source.id, 80)?.trim();
    let id = rawId || `node-${index + 1}`;
    if (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);

    const shape = FLOW_SHAPES.has(source.shape as FlowNodeShape)
      ? (source.shape as FlowNodeShape)
      : index === 0
        ? "start"
        : index === value.length - 1
          ? "end"
          : "process";
    const detail = text(source.detail, 400);
    nodes.push({ id, label, shape, ...(detail ? { detail } : {}) });
  }

  return nodes;
}

function flowEdges(value: unknown, nodeIds: Set<string>): FlowEdge[] {
  if (!Array.isArray(value)) return [];
  const edges: FlowEdge[] = [];

  for (const item of value.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const from = text(source.from, 80);
    const to = text(source.to, 80);
    if (!from || !to || from === to || !nodeIds.has(from) || !nodeIds.has(to)) continue;

    const label = text(source.label, 80);
    edges.push({
      from,
      to,
      style: source.style === "dashed" ? "dashed" : "solid",
      ...(label ? { label } : {}),
    });
  }

  return edges;
}

function chartBlock(raw: unknown): ChartBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const kind = text(source.kind, 40);
  const title = text(source.title, 200);
  const caption = text(source.caption, 600);
  const unit = text(source.unit, 24);
  const base = { title, caption };

  switch (kind) {
    case "column":
    case "bar":
    case "line":
    case "area":
    case "pie":
    case "donut":
    case "funnel":
    case "progress": {
      const data = chartData(source.data);
      return data.length ? { ...base, kind, unit, data } : null;
    }
    case "grouped":
    case "stacked": {
      const categories = stringList(source.categories, 100, 120);
      const series = chartSeries(source.series);
      return categories.length && series.length ? { ...base, kind, unit, categories, series } : null;
    }
    case "scatter": {
      const points: { x: number; y: number; label?: string }[] = [];
      if (Array.isArray(source.points)) {
        for (const item of source.points.slice(0, 200)) {
          if (!item || typeof item !== "object") continue;
          const point = item as Record<string, unknown>;
          const x = number(point.x);
          const y = number(point.y);
          if (typeof x !== "number" || typeof y !== "number") continue;
          const label = text(point.label, 120);
          points.push(label ? { x, y, label } : { x, y });
        }
      }
      return points.length
        ? { ...base, kind, points, xLabel: text(source.xLabel, 80), yLabel: text(source.yLabel, 80) }
        : null;
    }
    case "radar": {
      const axes = stringList(source.axes, 24, 80);
      const series = chartSeries(source.series);
      return axes.length && series.length ? { ...base, kind, axes, series } : null;
    }
    case "gauge": {
      const gauge = source.gauge as Record<string, unknown> | undefined;
      const value = number(gauge?.value);
      const max = number(gauge?.max);
      if (typeof value !== "number" || typeof max !== "number" || max <= 0) return null;
      return { ...base, kind, gauge: { value, max, unit: text(gauge?.unit, 24), label: text(gauge?.label, 120) } };
    }
    case "stat": {
      const stat = source.stat as Record<string, unknown> | undefined;
      const value = text(stat?.value, 40)?.trim();
      if (!value) return null;
      const delta = text(stat?.delta, 40)?.trim();
      const note = text(stat?.note, 200)?.trim();
      const trend = stat?.trend === "up" || stat?.trend === "down" || stat?.trend === "flat" ? stat.trend : undefined;
      return {
        ...base,
        kind,
        stat: { value, ...(delta ? { delta } : {}), ...(trend ? { trend } : {}), ...(note ? { note } : {}) },
      };
    }
    case "timeline": {
      const events = Array.isArray(source.events)
        ? source.events
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
            .map((item) => ({ label: String(item.label ?? "").slice(0, 160), detail: text(item.detail, 400) }))
            .filter((item) => item.label)
            .slice(0, 60)
        : [];
      return events.length ? { ...base, kind, events } : null;
    }
    case "flow": {
      const layout = source.layout === "horizontal" || source.layout === "grid" ? source.layout : "vertical";
      const style = source.style === "pill" || source.style === "chip" ? source.style : "card";
      const connector = source.connector === "line" || source.connector === "number" ? source.connector : "arrow";
      const nodes = flowNodes(source.nodes);

      if (nodes.length) {
        const ids = new Set(nodes.map((node) => node.id));
        const edges = flowEdges(source.edges, ids);
        return {
          ...base,
          kind,
          nodes,
          ...(Array.isArray(source.edges) ? { edges } : {}),
          layout,
          connector,
        };
      }

      const steps = stringList(source.steps, 40, 200);
      if (!steps.length) return null;
      return { ...base, kind, steps, layout, style, connector };
    }
    default:
      return null;
  }
}

function normaliseBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const type = text(source.type, 20);
  switch (type) {
    case "p":
      return { type, html: sanitizeRichText(String(source.html ?? "")) };
    case "h2": {
      const heading = text(source.text, 300) ?? "";
      if (!heading) return null;
      return { type, text: heading, id: slug(text(source.id, 120) || heading) };
    }
    case "h3": {
      const heading = text(source.text, 300) ?? "";
      if (!heading) return null;
      return { type, text: heading, id: slug(text(source.id, 120) || heading) };
    }
    case "quote":
      return { type, html: sanitizeRichText(String(source.html ?? "")), cite: text(source.cite, 300) };
    case "callout": {
      const tone = source.tone === "tip" || source.tone === "warning" ? source.tone : "note";
      return { type, tone, title: text(source.title, 200), html: sanitizeRichText(String(source.html ?? "")) };
    }
    case "code":
      return {
        type,
        lang: text(source.lang, 40) ?? "text",
        filename: text(source.filename, 200),
        code: String(source.code ?? "").slice(0, 400_000),
      };
    case "list":
      return { type, ordered: Boolean(source.ordered), items: stringList(source.items).map((item) => sanitizeRichText(item)) };
    case "image": {
      const src = safeUrl(String(source.src ?? ""), true);
      if (!src) return null;
      return { type, src, alt: text(source.alt, 400) ?? "", caption: text(source.caption, 600) };
    }
    case "table": {
      const head = stringList(source.head, 20, 200);
      const rows = Array.isArray(source.rows)
        ? source.rows
            .filter((row): row is unknown[] => Array.isArray(row))
            .slice(0, 100)
            .map((row) => stringList(row, 20, 2_000))
        : [];
      return head.length ? { type, head, rows } : null;
    }
    case "chart": {
      const chart = chartBlock(source.chart);
      return chart ? { type, chart } : null;
    }
    case "divider":
      return { type };
    default:
      return null;
  }
}

export function normalizeBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  const blocks = value
    .slice(0, MAX_BLOCKS)
    .map(normaliseBlock)
    .filter((block): block is Block => block !== null);
  const seen = new Map<string, number>();
  for (const block of blocks) {
    if (block.type !== "h2" && block.type !== "h3") continue;
    const count = (seen.get(block.id) ?? 0) + 1;
    seen.set(block.id, count);
    if (count > 1) block.id = `${block.id}-${count}`;
  }
  return blocks;
}
