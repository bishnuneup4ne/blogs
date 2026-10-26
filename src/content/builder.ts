import type { Block, FlowConnector, FlowLayout, FlowStyle } from "@/lib/types";

const slugify = (v: string) =>
  v.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const p = (html: string): Block => ({ type: "p", html });

export const h2 = (text: string): Block => ({ type: "h2", text, id: slugify(text) });

export const h3 = (text: string): Block => ({ type: "h3", text, id: slugify(text) });

export const quote = (html: string, cite?: string): Block => ({ type: "quote", html, cite });

export const note = (html: string, title?: string): Block => ({
  type: "callout",
  tone: "note",
  html,
  title,
});

export const tip = (html: string, title?: string): Block => ({
  type: "callout",
  tone: "tip",
  html,
  title,
});

export const warn = (html: string, title?: string): Block => ({
  type: "callout",
  tone: "warning",
  html,
  title,
});

export const code = (lang: string, source: string, filename?: string): Block => ({
  type: "code",
  lang,
  filename,
  code: source.trim(),
});

export const ul = (...items: string[]): Block => ({ type: "list", ordered: false, items });

export const ol = (...items: string[]): Block => ({ type: "list", ordered: true, items });

export const img = (src: string, alt: string, caption?: string): Block => ({
  type: "image",
  src,
  alt,
  caption,
});

export const table = (head: string[], ...rows: string[][]): Block => ({
  type: "table",
  head,
  rows,
});

export const divider = (): Block => ({ type: "divider" });

const pairs = (data: [string, number][]) => data.map(([label, value]) => ({ label, value }));

export const column = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "column", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const bar = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "bar", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const stat = (
  title: string,
  value: string,
  opts: { delta?: string; trend?: "up" | "down" | "flat"; note?: string; caption?: string } = {},
): Block => ({
  type: "chart",
  chart: {
    kind: "stat",
    title,
    caption: opts.caption,
    stat: { value, ...(opts.delta ? { delta: opts.delta } : {}), ...(opts.trend ? { trend: opts.trend } : {}), ...(opts.note ? { note: opts.note } : {}) },
  },
});

export const grouped = (
  title: string,
  categories: string[],
  series: [string, number[]][],
  opts: { unit?: string; caption?: string } = {},
): Block => ({
  type: "chart",
  chart: { kind: "grouped", title, unit: opts.unit, caption: opts.caption, categories, series: series.map(([name, values]) => ({ name, values })) },
});

export const stacked = (
  title: string,
  categories: string[],
  series: [string, number[]][],
  opts: { unit?: string; caption?: string } = {},
): Block => ({
  type: "chart",
  chart: { kind: "stacked", title, unit: opts.unit, caption: opts.caption, categories, series: series.map(([name, values]) => ({ name, values })) },
});

export const line = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "line", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const area = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "area", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const pie = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "pie", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const donut = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "donut", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const scatter = (
  title: string,
  points: [number, number][],
  opts: { xLabel?: string; yLabel?: string; caption?: string } = {},
): Block => ({
  type: "chart",
  chart: { kind: "scatter", title, xLabel: opts.xLabel, yLabel: opts.yLabel, caption: opts.caption, points: points.map(([x, y]) => ({ x, y })) },
});

export const radar = (title: string, axes: string[], series: [string, number[]][], opts: { caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "radar", title, caption: opts.caption, axes, series: series.map(([name, values]) => ({ name, values })) },
});

export const gauge = (title: string, value: number, max: number, opts: { unit?: string; label?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "gauge", title, caption: opts.caption, gauge: { value, max, unit: opts.unit, label: opts.label } },
});

export const funnel = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "funnel", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const progress = (title: string, data: [string, number][], opts: { unit?: string; caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "progress", title, unit: opts.unit, caption: opts.caption, data: pairs(data) },
});

export const timeline = (title: string, events: [string, string][], opts: { caption?: string } = {}): Block => ({
  type: "chart",
  chart: { kind: "timeline", title, caption: opts.caption, events: events.map(([label, detail]) => ({ label, detail })) },
});

export const flow = (
  title: string,
  steps: string[],
  opts: { caption?: string; layout?: FlowLayout; style?: FlowStyle; connector?: FlowConnector } = {},
): Block => ({
  type: "chart",
  chart: {
    kind: "flow",
    title,
    caption: opts.caption,
    steps,
    ...(opts.layout ? { layout: opts.layout } : {}),
    ...(opts.style ? { style: opts.style } : {}),
    ...(opts.connector ? { connector: opts.connector } : {}),
  },
});
