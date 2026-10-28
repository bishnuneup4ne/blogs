export type CategorySlug = string;

/** Must match the fn_topics.pastel CHECK constraint in supabase/schema.sql. */
export const PASTELS = ["blue", "green", "mint", "yellow", "red", "purple", "gray"] as const;
export type Pastel = (typeof PASTELS)[number];

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  color: string;
  pastel: Pastel;
  image?: string;
  /* Material 3 style crop for the topic tile: circle | squircle | leaf | blob | petal */
  shape?: string;
  sort_order?: number;
}

export type TagSlug = string;

/** One social / related link on a person card. `icon` picks a socialPaths
 *  glyph (x, github, linkedin, instagram, youtube, facebook, threads, email). */
export interface SocialLink {
  label: string;
  url: string;
  icon?: string;
}

export interface Author {
  name: string;
  role: string;
  avatar: string;
  bio?: string;
  socials?: SocialLink[];
}

/** The four layouts the person card renders in. */
export type PersonStyle = "google" | "card" | "minimal" | "feature";

export type RowSize = "full" | "square" | "portrait" | "wide";

/** One slide in a media row: a photo/clip/embed, or a customer quote card. */
export type RowItem =
  | { kind?: "media"; src: string; alt: string; size?: RowSize }
  | { kind: "quote"; html: string; author?: string; role?: string };

/** Per-block styling chosen in the editor: a named variant plus an optional
    accent colour (hex) that themes the block's background/rule/details. */
export type BlockStyle = { variant?: string; accent?: string };

/** Colours any block can carry; the renderer maps them to CSS vars so an
    author can set a custom accent / background / text on essentially any block. */
export type BlockColors = { accent?: string; bg?: string; text?: string };

export type BlockBase =
  | { type: "p"; html: string }
  | { type: "h2"; text: string; id: string }
  | { type: "imgtext"; src: string; alt: string; side?: "left" | "right"; html: string }
  | { type: "embed"; url: string; caption?: string }
  | { type: "keypoints"; title?: string; items: string[]; variant?: string }
  | { type: "stats"; items: StatItem[]; columns?: number; variant?: string }
  | { type: "timestrip"; items: TimeStripItem[]; title?: string; variant?: string }
  | { type: "bafter"; before: string; after: string; labelBefore?: string; labelAfter?: string; alt?: string; variant?: string }
  | { type: "h3"; text: string; id: string }
  | { type: "quote"; html: string; cite?: string; variant?: "bar" | "card" | "big" | "plain"; bg?: string; size?: "sm" | "md" | "lg" }
  | { type: "callout"; tone: "note" | "tip" | "warning" | "info"; title?: string; html: string; icon?: string; variant?: "chip" | "left" | "outline" | "filled" }
  | { type: "code"; lang: string; filename?: string; code: string; variant?: string }
  | { type: "list"; ordered: boolean; items: string[]; variant?: string }
  | { type: "image"; src: string; alt: string; caption?: string; width?: "full" | "wide" | "medium" | "small"; variant?: string }
  | { type: "row"; items: RowItem[]; columns?: number; caption?: string; variant?: string }
  | { type: "video"; url: string; poster?: string; caption?: string; autoplay?: boolean; variant?: string }
  | { type: "related"; slug: string; title: string; description?: string; image?: string; eyebrow?: string; cta?: string; color?: string; variant?: "tout" | "banner" | "minimal" }
  | { type: "table"; head: string[]; rows: string[][]; variant?: "default" | "striped" | "cards" }
  | { type: "chart"; chart: ChartBlock }
  | { type: "cta"; label: string; href: string; style?: "primary" | "outline"; note?: string; variant?: "button" | "banner" | "link" }
  | { type: "footnote"; text: string }
  | { type: "accordion"; title?: string; items: AccordionItem[]; variant?: "cards" | "divided" | "numbered" }
  /** Legacy: rendered as nothing, kept so older posts still save. */
  | { type: "jumplinks"; title?: string }
  | { type: "proscons"; pros: string[]; cons: string[]; prosLabel?: string; consLabel?: string; variant?: "columns" | "split" | "stacked" }
  | { type: "steps"; title?: string; items: StepItem[]; variant?: "numbered" | "connected" | "cards" }
  | { type: "glossary"; title?: string; terms: GlossaryTerm[]; variant?: "rows" | "grid" | "chips" }
  | { type: "diff"; lang?: string; filename?: string; before: string; after: string; variant?: "sidebyside" | "unified" }
  | { type: "person"; name: string; role?: string; avatar?: string; html?: string; links?: PersonLink[]; variant?: "profile" | "card" | "inline" | "quote" }
  | { type: "progress"; label?: string; value: number; max?: number; unit?: string; note?: string; color?: string; variant?: "bar" | "ring" | "segmented" }
  | { type: "linkcards"; title?: string; items: LinkCard[]; variant?: "grid" | "list" | "tiles" }
  | { type: "compare"; columns: [string, string]; rows: CompareRow[]; variant?: "table" | "columns" }
  | { type: "countdown"; label?: string; date: string; note?: string; variant?: "grid" | "inline" }
  | { type: "divider" };

/** Every block also accepts the shared colour overrides. */
export type Block = BlockBase & BlockColors;


/** A social/profile link on a person card. `icon` is an optional key into the
    shared social icon set (github, linkedin, x, …); falls back to a generic glyph. */
export interface PersonLink {
  label: string;
  href: string;
  icon?: string;
}

/** One feature row in the comparison table (✓ / ✗ / free text per column). */
export interface CompareRow {
  feature: string;
  a: string;
  b: string;
}

/** A clickable resource tile in the link-cards block. */
export interface LinkCard {
  title: string;
  href: string;
  desc?: string;
}

/** One collapsible row in the accordion / FAQ block. */
export interface AccordionItem {
  q: string;
  html: string;
}

/** One numbered step in the how-to walkthrough. */
export interface StepItem {
  title: string;
  detail?: string;
}

/** A term and its definition in the glossary block. */
export interface GlossaryTerm {
  term: string;
  def: string;
}

export type ChartDatum = { label: string; value: number };

/** One figure in the stats block: a big number with a short caption. */
export interface StatItem {
  value: string;
  label: string;
  note?: string;
}

/** One stop on the timeline strip block. */
export interface TimeStripItem {
  date: string;
  title: string;
  detail?: string;
}

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
  cover?: { src: string; alt: string; height?: number; focal?: number };
  featured?: boolean;
  author: Author;
  blocks: Block[];
}

export interface Series {
  slug: string;
  title: string;
  description: string;
  cover?: string;
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
