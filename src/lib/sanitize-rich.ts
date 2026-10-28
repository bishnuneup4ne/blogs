import type { AccordionItem, Block, ChartBlock, CompareRow, FlowEdge, FlowNode, FlowNodeShape, GlossaryTerm, LinkCard, PersonLink, StatItem, StepItem, TimeStripItem } from "@/lib/types";

const ALLOWED_TAGS = new Set([
  "a", "p", "br", "strong", "em", "b", "i", "u", "s", "strike", "mark", "sub", "sup", "small", "kbd", "code", "pre", "ul", "ol", "li",
  "blockquote", "h2", "h3", "h4", "span", "img", "div",
]);
const VOID_TAGS = new Set(["br", "img"]);
const DROP_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math", "template",
  "noscript", "textarea", "title", "xmp", "plaintext", "form",
]);
const SAFE_STYLE_PROPS = new Set(["color", "background-color", "text-decoration-line", "text-decoration-color", "text-decoration-thickness", "text-underline-offset"]);

/** Keep only whitelisted declarations from an inline style attribute. */
function safeStyle(value: string): string | null {
  const kept = value
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => {
      const colon = d.indexOf(":");
      return colon > 0 && SAFE_STYLE_PROPS.has(d.slice(0, colon).trim().toLowerCase());
    })
    .filter((d) => !/[<>{}"']/.test(d) && !/url|expression/i.test(d));
  return kept.length ? kept.join("; ") + ";" : null;
}

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "title"],
  span: ["style"],
  mark: ["style"],
  u: ["style"],
  s: ["style"],
  strong: ["style"],
  em: ["style"],
  b: ["style"],
  i: ["style"],
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

/** Links humans click: any http(s) host, relative path, mailto or anchor.
    Unlike safeUrl (used for media) this is not tied to the storage host. */
function safeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f\s]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#") || /^mailto:[^\s]+$/i.test(value)) return value;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function safeUrl(raw: string, image = false, allowedHostnames: Set<string> | null = null): string | null {
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f\s]/.test(value)) return null;
  const lower = value.toLowerCase();
  // Allow relative paths and data URLs unconditionally.
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("data:")) return value;
  // Pasted links often carry stray spaces/newlines (e.g. from a share sheet).
  const compact = value.replace(/\s+/g, "");
  if (lower.startsWith("https://") || lower.startsWith("http://")) {
    let parsed: URL;
    try {
      parsed = new URL(compact);
    } catch {
      return null;
    }
    // Explicit allowlist (Next.js remotePatterns) wins when present.
    if (allowedHostnames && allowedHostnames.size > 0) {
      return allowedHostnames.has(parsed.hostname) ? compact : null;
    }
    // Otherwise, when Supabase is configured, only its storage host is allowed.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        if (parsed.hostname !== new URL(supabaseUrl).hostname) return null;
      } catch {
        /* malformed env — fall through */
      }
    }
    return compact;
  }
  if (!image && (lower.startsWith("mailto:") || value.startsWith("#"))) return value;
  return null;
}

/** Get the set of allowed hostnames for Next.js image optimization, derived from the Supabase URL. */
function getAllowedImageHostnames(): Set<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return new Set();
  try {
    const url = new URL(supabaseUrl);
    return new Set([url.hostname]);
  } catch {
    return new Set();
  }
}

/** Image URLs must also resolve to an allowed host. */
export function safeImageUrl(value: string): string | null {
  return safeUrl(value, true, getAllowedImageHostnames());
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
    } else if (rawName === "style") {
      const style = safeStyle(rawValue);
      if (style) out.push(`style="${escapeAttr(style)}"`);
    } else {
      out.push(`${rawName}="${escapeAttr(rawValue.slice(0, 600))}"`);
    }
  }
  return out;
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

/** Keep a variant string only if it's one of the block's allowed styles. */
function variant<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
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
    case "h2":
    case "h3": {
      const heading = text(source.text, 300) ?? "";
      // An empty heading is a placeholder the author hasn't typed into yet —
      // dropping it here failed the whole save with "content blocks invalid".
      const id = slug(text(source.id, 120) || heading) || `h-${Math.random().toString(36).slice(2, 8)}`;
      return { type, text: heading, id };
    }
    case "quote": {
      const qVariant = variant(source.variant, ["bar", "card", "big", "plain"]);
      // Only simple hex/rgb values — anything else could smuggle `url(...)`.
      const bg = typeof source.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(source.bg.trim()) ? source.bg.trim() : undefined;
      const size = source.size === "sm" || source.size === "lg" ? source.size : undefined;
      return {
        type, html: sanitizeRichText(String(source.html ?? "")), cite: text(source.cite, 300),
        ...(qVariant ? { variant: qVariant } : {}), ...(bg ? { bg } : {}), ...(size ? { size } : {}),
      };
    }
    case "callout": {
      const tone = source.tone === "tip" || source.tone === "warning" || source.tone === "info" ? source.tone : "note";
      const v = variant(source.variant, ["chip", "left", "outline", "filled"]);
      return { type, tone, title: text(source.title, 200), html: sanitizeRichText(String(source.html ?? "")), icon: text(source.icon, 8) ?? undefined, ...(v ? { variant: v } : {}) };
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
      // A freshly inserted block has no src yet. Dropping it failed the whole
      // save with "content blocks are invalid" mid-writing; keep the empty
      // block so the editor round-trips, and filter empty ones at render.
      const rawSrc = String(source.src ?? "").trim();
      if (!rawSrc) return { type, src: "", alt: text(source.alt, 400) ?? "", caption: text(source.caption, 600) };
      const src = safeUrl(rawSrc, true);
      if (!src) return null;
      const width = ["full", "wide", "medium", "small"].includes(String(source.width)) ? (String(source.width) as "full" | "wide" | "medium" | "small") : undefined;
      return { type, src, alt: text(source.alt, 400) ?? "", caption: text(source.caption, 600), ...(width ? { width } : {}) };
    }
    case "row": {
      const ROW_SIZES = ["full", "square", "portrait", "wide"] as const;
      type RowItem = { kind?: "media"; src: string; alt: string; size?: (typeof ROW_SIZES)[number] } | { kind: "quote"; html: string; author?: string; role?: string };
      const rawItems = Array.isArray(source.items) ? source.items.slice(0, 60) : [];
      const items = rawItems
        .map((it): RowItem | null => {
          const o = (it ?? {}) as Record<string, unknown>;
          if (o.kind === "quote") {
            const body = sanitizeRichText(String(o.html ?? ""));
            if (!body) return null;
            const author = text(o.author, 200);
            const role = text(o.role, 200);
            return { kind: "quote", html: body, ...(author ? { author } : {}), ...(role ? { role } : {}) };
          }
          const src: string = o.src ? (safeUrl(String(o.src), true) ?? "") : "";
          // Empty slides are placeholders in a half-built carousel; keep them
          // so saving doesn't fail, and let the renderer skip them.
          if (!src && String(o.src ?? "").trim()) return null;
          const size = (ROW_SIZES as readonly string[]).includes(String(o.size)) ? { size: o.size as (typeof ROW_SIZES)[number] } : {};
          return { src, alt: text(o.alt, 400) ?? "", ...size };
        })
        .filter((x): x is RowItem => Boolean(x));
      // One item is a valid single-card row; an empty row is what should fail.
      if (items.length < 1) return null;
      const wanted = Math.min(Math.max(Math.round(Number(source.columns)) || items.length, 1), 6);
      const columns = Number.isFinite(wanted) ? wanted : items.length;
      return { type, items, columns, caption: text(source.caption, 600) };
    }
    case "video": {
      // Videos are embedded or played from their own host (YouTube, Vimeo,
      // Supabase), so the image allowlist must not apply here — enforcing it
      // silently dropped every non-Supabase clip and failed the whole save.
      const rawUrl = String(source.url ?? "").trim();
      const url: string = rawUrl ? (safeUrl(rawUrl, false, new Set()) ?? "") : "";
      if (rawUrl && !url) return null;
      const poster = source.poster ? safeUrl(String(source.poster), true) : null;
      const autoplay = Boolean(source.autoplay);
      return { type, url, ...(poster ? { poster } : {}), ...(autoplay ? { autoplay: true } : {}), caption: text(source.caption, 600) };
    }
    case "related": {
      const relSlug = text(source.slug, 200) ?? "";
      const relTitle = text(source.title, 300) ?? "";
      // Placeholder until the author picks a target post.
      const image = source.image ? safeUrl(String(source.image), true) : null;
      const eyebrow = text(source.eyebrow, 80);
      const cta = text(source.cta, 80);
      const color = ["blue", "green", "mint", "yellow", "red", "purple", "gray"].includes(String(source.color)) ? String(source.color) : null;
      const v = variant(source.variant, ["tout", "banner", "minimal"]);
      return {
        type, slug: relSlug, title: relTitle, description: text(source.description, 600),
        ...(image ? { image } : {}), ...(eyebrow ? { eyebrow } : {}), ...(cta ? { cta } : {}), ...(color ? { color } : {}), ...(v ? { variant: v } : {}),
      };
    }
    case "table": {
      const head = stringList(source.head, 20, 200);
      const rows = Array.isArray(source.rows)
        ? source.rows
            .filter((row): row is unknown[] => Array.isArray(row))
            .slice(0, 100)
            .map((row) => stringList(row, 20, 2_000))
        : [];
      const v = variant(source.variant, ["default", "striped", "cards"]);
      return { type, head, rows, ...(v ? { variant: v } : {}) };
    }
    case "chart": {
      const chart = chartBlock(source.chart);
      return chart ? { type, chart } : null;
    }
    case "cta": {
      const label = text(source.label, 80)?.trim() ?? "";
      const rawHref = String(source.href ?? "").trim();
      const href = rawHref ? (safeUrl(rawHref, false) ?? "") : "";
      const v = variant(source.variant, ["button", "banner", "link"]);
      return {
        type,
        label,
        href,
        style: source.style === "outline" ? "outline" : "primary",
        note: text(source.note, 200) ?? undefined,
        ...(v ? { variant: v } : {}),
      };
    }
    case "footnote": {
      return { type, text: text(source.text, 800)?.trim() ?? "" };
    }
    case "embed": {
      // Embeds are external players (Instagram, X, TikTok, GitHub, CodePen…),
      // so the Supabase-storage host restriction that applies to images must
      // not apply here — only require a well-formed http(s)/relative URL.
      // Users can also paste full embed code (blockquote + script); the block
      // only reads URLs out of it, never renders it raw, so allow it through.
      const raw = String(source.url ?? "").trim();
      if (!raw) return { type, url: "", caption: text(source.caption, 600) ?? undefined };
      let parsed: URL | null = null;
      try {
        parsed = new URL(raw);
      } catch {
        parsed = null;
      }
      const ok = parsed
        ? parsed.protocol === "https:" || parsed.protocol === "http:"
        : raw.startsWith("/") && !raw.startsWith("//");
      const looksLikeEmbedCode = /<[a-z]/i.test(raw) && /https?:\/\/\S+/i.test(raw);
      if (!ok && !looksLikeEmbedCode) return null;
      return { type, url: raw.slice(0, 8_000), caption: text(source.caption, 600) ?? undefined };
    }
    case "keypoints": {
      // Drop empty rows rather than the whole block — they are the normal
      // state of a freshly inserted takeaway list.
      const items = stringList(source.items)
        .map((item) => sanitizeRichText(item))
        .filter((item) => item.replace(/<[^>]+>/g, "").trim() || /<img|iframe|video/i.test(item))
        .slice(0, 12);
      const kpV = variant(source.variant, ["card", "plain", "checklist"]);
      return { type, title: text(source.title, 200) ?? undefined, items, ...(kpV ? { variant: kpV } : {}) };
    }
    case "imgtext": {
      const rawSrc = String(source.src ?? "").trim();
      const src = rawSrc ? safeUrl(rawSrc, true) : "";
      if (rawSrc && !src) return null;
      return {
        type,
        src: src ?? "",
        alt: text(source.alt, 400) ?? "",
        html: sanitizeRichText(String(source.html ?? "")),
        ...(source.side === "right" ? { side: "right" as const } : {}),
      };
    }
    case "stats": {
      const items = Array.isArray(source.items)
        ? source.items
            .slice(0, 6)
            .map((it): StatItem | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const value = text(o.value, 40)?.trim();
              const label = text(o.label, 160)?.trim();
              if (!value && !label) return null;
              const note = text(o.note, 200);
              return { value: value ?? "", label: label ?? "", ...(note ? { note } : {}) };
            })
            .filter((x): x is StatItem => x !== null)
        : [];
      if (!items.length) return null;
      const cols = Number(source.columns);
      const v = variant(source.variant, ["cards", "plain", "grid"]);
      return { type, items, ...(Number.isFinite(cols) ? { columns: Math.min(4, Math.max(2, Math.round(cols))) } : {}), ...(v ? { variant: v } : {}) };
    }
    case "timestrip": {
      const items = Array.isArray(source.items)
        ? source.items
            .slice(0, 24)
            .map((it): TimeStripItem | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const date = text(o.date, 40)?.trim();
              const title = text(o.title, 200)?.trim();
              if (!date && !title) return null;
              const detail = text(o.detail, 600);
              return { date: date ?? "", title: title ?? "", ...(detail ? { detail } : {}) };
            })
            .filter((x): x is TimeStripItem => x !== null)
        : [];
      if (!items.length) return null;
      const v = variant(source.variant, ["spine", "cards", "rows"]);
      return { type, items, title: text(source.title, 120) ?? undefined, ...(v ? { variant: v } : {}) };
    }
    case "bafter": {
      const before = String(source.before ?? "").trim();
      const after = String(source.after ?? "").trim();
      // A freshly inserted block has no images yet — keep it so saves round-trip.
      if (!before && !after) {
        return { type, before: "", after: "", labelBefore: text(source.labelBefore, 40), labelAfter: text(source.labelAfter, 40) };
      }
      const b = before ? safeUrl(before, true) : "";
      const a = after ? safeUrl(after, true) : "";
      if ((before && !b) || (after && !a)) return null;
      return {
        type,
        before: b ?? "",
        after: a ?? "",
        labelBefore: text(source.labelBefore, 40),
        labelAfter: text(source.labelAfter, 40),
        alt: text(source.alt, 400) ?? undefined,
      };
    }
    case "jumplinks":
      // Legacy block: no longer rendered, but must still round-trip a save.
      return { type, title: text(source.title, 200) ?? undefined };
    case "accordion": {
      const items = Array.isArray(source.items)
        ? source.items
            .slice(0, 30)
            .map((it): AccordionItem | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const q = text(o.q, 300)?.trim();
              if (!q) return null;
              return { q, html: sanitizeRichText(String(o.html ?? "")) };
            })
            .filter((x): x is AccordionItem => x !== null)
        : [];
      if (!items.length) return null;
      const v = variant(source.variant, ["cards", "divided", "numbered"]);
      return { type, title: text(source.title, 120) ?? undefined, items, ...(v ? { variant: v } : {}) };
    }
    case "proscons": {
      const pros = stringList(source.pros, 20, 400).map((item) => sanitizeRichText(item));
      const cons = stringList(source.cons, 20, 400).map((item) => sanitizeRichText(item));
      if (!pros.length && !cons.length) return null;
      const v = variant(source.variant, ["columns", "split", "stacked"]);
      return {
        type,
        pros,
        cons,
        prosLabel: text(source.prosLabel, 60) ?? undefined,
        consLabel: text(source.consLabel, 60) ?? undefined,
        ...(v ? { variant: v } : {}),
      };
    }
    case "steps": {
      const items = Array.isArray(source.items)
        ? source.items
            .slice(0, 30)
            .map((it): StepItem | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const t = text(o.title, 200)?.trim();
              if (!t) return null;
              const detail = text(o.detail, 800);
              return { title: t, ...(detail ? { detail } : {}) };
            })
            .filter((x): x is StepItem => x !== null)
        : [];
      if (!items.length) return null;
      const v = variant(source.variant, ["numbered", "connected", "cards"]);
      return { type, title: text(source.title, 120) ?? undefined, items, ...(v ? { variant: v } : {}) };
    }
    case "glossary": {
      const terms = Array.isArray(source.terms)
        ? source.terms
            .slice(0, 50)
            .map((it): GlossaryTerm | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const term = text(o.term, 120)?.trim();
              const def = text(o.def, 600)?.trim();
              if (!term || !def) return null;
              return { term, def };
            })
            .filter((x): x is GlossaryTerm => x !== null)
        : [];
      if (!terms.length) return null;
      const v = variant(source.variant, ["rows", "grid", "chips"]);
      return { type, title: text(source.title, 120) ?? undefined, terms, ...(v ? { variant: v } : {}) };
    }
    case "diff": {
      const before = String(source.before ?? "").slice(0, 20_000);
      const after = String(source.after ?? "").slice(0, 20_000);
      if (!before.trim() && !after.trim()) return null;
      const dv = variant(source.variant, ["sidebyside", "unified"]);
      return {
        type,
        lang: text(source.lang, 40) ?? undefined,
        filename: text(source.filename, 200) ?? undefined,
        before,
        after,
        ...(dv ? { variant: dv } : {}),
      };
    }
    case "person": {
      const name = text(source.name, 120)?.trim();
      if (!name) return null;
      const links = Array.isArray(source.links)
        ? source.links
            .slice(0, 8)
            .map((it): PersonLink | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const label = text(o.label, 60)?.trim();
              const href = safeLinkUrl(String(o.href ?? ""));
              if (!label || !href) return null;
              const icon = text(o.icon, 24)?.trim().toLowerCase();
              return { label, href, ...(icon ? { icon } : {}) };
            })
            .filter((x): x is PersonLink => x !== null)
        : [];
      const avatar = source.avatar ? safeUrl(String(source.avatar), true) : null;
      const pv = variant(source.variant, ["profile", "card", "inline", "quote"]);
      return {
        type,
        name,
        role: text(source.role, 120) ?? undefined,
        ...(avatar ? { avatar } : {}),
        html: sanitizeRichText(String(source.html ?? "")) || undefined,
        ...(links.length ? { links } : {}),
        ...(pv ? { variant: pv } : {}),
      };
    }
    case "progress": {
      const max = number(source.max) ?? 100;
      const value = number(source.value);
      if (typeof value !== "number" || max <= 0) return null;
      const color = /^#[0-9a-f]{3,8}$/i.test(String(source.color ?? "").trim()) ? String(source.color).trim() : undefined;
      const v = variant(source.variant, ["bar", "ring", "segmented"]);
      return {
        type,
        label: text(source.label, 120) ?? undefined,
        value: Math.min(Math.max(value, 0), max),
        max,
        unit: text(source.unit, 24) ?? undefined,
        note: text(source.note, 200) ?? undefined,
        ...(color ? { color } : {}),
        ...(v ? { variant: v } : {}),
      };
    }
    case "linkcards": {
      const items = Array.isArray(source.items)
        ? source.items
            .slice(0, 12)
            .map((it): LinkCard | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const title = text(o.title, 120)?.trim();
              const href = safeLinkUrl(String(o.href ?? ""));
              if (!title || !href) return null;
              const desc = text(o.desc, 200);
              return { title, href, ...(desc ? { desc } : {}) };
            })
            .filter((x): x is LinkCard => x !== null)
        : [];
      if (!items.length) return null;
      const v = variant(source.variant, ["grid", "list", "tiles"]);
      return { type, title: text(source.title, 120) ?? undefined, items, ...(v ? { variant: v } : {}) };
    }
    case "compare": {
      const columnsRaw = Array.isArray(source.columns) ? source.columns.slice(0, 2) : [];
      const columns: [string, string] = [String(columnsRaw[0] ?? "Option A").slice(0, 60), String(columnsRaw[1] ?? "Option B").slice(0, 60)];
      const rows = Array.isArray(source.rows)
        ? source.rows
            .slice(0, 30)
            .map((it): CompareRow | null => {
              const o = (it ?? {}) as Record<string, unknown>;
              const feature = text(o.feature, 160)?.trim();
              if (!feature) return null;
              return { feature, a: String(o.a ?? "").slice(0, 120), b: String(o.b ?? "").slice(0, 120) };
            })
            .filter((x): x is CompareRow => x !== null)
        : [];
      if (!rows.length) return null;
      const v = variant(source.variant, ["table", "columns"]);
      return { type, columns, rows, ...(v ? { variant: v } : {}) };
    }
    case "countdown": {
      const date = text(source.date, 40)?.trim();
      if (!date || Number.isNaN(Date.parse(date))) return null;
      const v = variant(source.variant, ["grid", "inline"]);
      return {
        type,
        label: text(source.label, 120) ?? undefined,
        date,
        note: text(source.note, 200) ?? undefined,
        ...(v ? { variant: v } : {}),
      };
    }
    case "divider":
      return { type };
    default:
      return null;
  }
}

/** Types the sanitizer refuses, so a save can say which block to fix. */
export function findInvalidBlock(value: unknown): { index: number; type: string } | null {
  if (!Array.isArray(value)) return null;
  for (let i = 0; i < Math.min(value.length, MAX_BLOCKS); i++) {
    if (normaliseBlock(value[i]) === null) {
      const type = String((value[i] as Record<string, unknown> | null)?.type ?? "unknown");
      return { index: i, type };
    }
  }
  return null;
}

/** Colour keys every block may carry; applied by the renderer as CSS vars. */
const BLOCK_COLOR_KEYS = ["accent", "bg", "text"] as const;

function withBlockColors(block: Block | null, source: Record<string, unknown>): Block | null {
  if (!block) return null;
  for (const key of BLOCK_COLOR_KEYS) {
    const raw = source[key];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    // Only plain hex reaches CSS — anything else could inject url() or a quote.
    if (/^#[0-9a-f]{3,8}$/i.test(value)) (block as Record<string, unknown>)[key] = value;
  }
  return block;
}

export function normalizeBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  const blocks = value
    .slice(0, MAX_BLOCKS)
    .map((raw) => withBlockColors(normaliseBlock(raw), (raw ?? {}) as Record<string, unknown>))
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
