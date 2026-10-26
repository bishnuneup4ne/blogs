export type CategorySlug = string;

export type Pastel = "blue" | "green" | "yellow" | "red" | "purple" | "gray";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  color: string;
  pastel: Pastel;
}

export type TagSlug = string;

export interface Author {
  name: string;
  role: string;
  avatar: string;
}

export type Block =
  | { type: "p"; html: string }
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string; id: string }
  | { type: "quote"; html: string; cite?: string }
  | { type: "callout"; tone: "note" | "tip" | "warning"; title?: string; html: string }
  | { type: "code"; lang: string; filename?: string; code: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption?: string; width?: "full" | "wide" | "medium" | "small" }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "chart"; chart: ChartBlock }
  | { type: "divider" };

export type ChartDatum = { label: string; value: number };

/** A named series of values, one per category — used by grouped/stacked/radar. */
export type ChartSeries = { name: string; values: number[] };

export type ScatterPoint = { x: number; y: number; label?: string };

export type GaugeSpec = { value: number; max: number; unit?: string; label?: string };

export type ChartBase = { title?: string; caption?: string };

export type StatSpec = { value: string; delta?: string; trend?: "up" | "down" | "flat"; note?: string };

/** Flow-chart layout knobs: direction, node shape, and connector style. */
export type FlowLayout = "vertical" | "horizontal" | "grid";
export type FlowStyle = "card" | "pill" | "chip";
export type FlowConnector = "arrow" | "line" | "number";
export type FlowNodeShape = "start" | "end" | "process" | "decision" | "data" | "document" | "note";

export interface FlowNode {
  id: string;
  label: string;
  detail?: string;
  shape?: FlowNodeShape;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed";
}

/** Every chart kind the renderer understands. All are data-driven — no images. */
export type ChartBlock =
  | (ChartBase & { kind: "bar"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "column"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "grouped"; unit?: string; categories: string[]; series: ChartSeries[] })
  | (ChartBase & { kind: "stacked"; unit?: string; categories: string[]; series: ChartSeries[] })
  | (ChartBase & { kind: "line"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "area"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "pie"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "donut"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "scatter"; xLabel?: string; yLabel?: string; points: ScatterPoint[] })
  | (ChartBase & { kind: "radar"; axes: string[]; series: ChartSeries[] })
  | (ChartBase & { kind: "gauge"; gauge: GaugeSpec })
  | (ChartBase & { kind: "funnel"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "progress"; unit?: string; data: ChartDatum[] })
  | (ChartBase & { kind: "timeline"; events: { label: string; detail?: string }[] })
  | (ChartBase & { kind: "stat"; stat: StatSpec })
  | (ChartBase & {
      kind: "flow";
      /** Legacy linear steps. New charts use nodes + edges. */
      steps?: string[];
      nodes?: FlowNode[];
      edges?: FlowEdge[];
      layout?: FlowLayout;
      style?: FlowStyle;
      connector?: FlowConnector;
    });

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  category: CategorySlug;
  tags: TagSlug[];
  cover?: { src: string; alt: string; height?: number };
  featured?: boolean;
  author: Author;
  blocks: Block[];
}

export interface Series {
  slug: string;
  title: string;
  description: string;
  posts: { slug: string; title: string }[];
}

export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  takenAt: string;
  camera?: string;
  kind: "image" | "video";
  poster?: string;
}

export interface Album {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  year: number;
  cover: string;
  photos: GalleryPhoto[];
}
