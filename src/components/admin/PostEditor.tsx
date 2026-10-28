"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum, type ApiPost, type ApiUpload, ApiTopic } from "./api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "./Dialog";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { StatusChip, statusTone } from "@/components/admin/kit";
import type { Block, ChartBlock as ChartBlockType, FlowEdge, FlowNode, FlowNodeShape, RowItem, RowSize } from "@/lib/types";
import { classifyVideo } from "@/lib/external-video";
import { ChartBlockView, FLOW_SHAPE_OPTIONS } from "@/components/blog/ChartBlock";

import { RichEditor } from "./RichEditor";
import { PostContent } from "@/components/blog/PostContent";
import { outlineOf, runChecks, scoreChecks, type CheckLevel } from "./post-quality";
import styles from "./PostEditor.module.scss";

const slugifyTitle = (v: string) =>
  v.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/* The posts table has no cover_height / focal columns, so those values ride
   along inside cover_alt as `[[cover:h=560;f=30]]`. Split them back out. */
const COVER_META = /\[\[cover:h=(\d+);f=(\d+)\]\]/;
function stripCoverMeta(raw: string | null | undefined): { alt: string; height: number | null; focal: number | null } {
  const value = raw ?? "";
  const m = value.match(COVER_META);
  const h = m ? Number(m[1]) : 0;
  return {
    alt: value.replace(COVER_META, "").trim(),
    // h=0 means the "Auto" state, not a zero-pixel cover.
    height: h > 0 ? h : null,
    focal: m ? Number(m[2]) : null,
  };
}

export interface EditorDraft {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: ApiPost["status"];
  date: string;
  category: string;
  tags: string[];
  cover: string | null;
  coverAlt: string;
  coverFocal?: number | null;
  coverHeight: number | null;
  featured: boolean;
  readingMinutes: number;
  blocks: Block[];
}

function toDraft(p: ApiPost): EditorDraft {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? "",
    status: p.status,
    date: String(p.date).slice(0, 10),
    category: p.topic_slug ?? "",
    tags: p.tags ?? [],
    cover: p.cover_url ?? null,
    coverAlt: stripCoverMeta(p.cover_alt).alt,
    coverFocal: p.cover_focal ?? stripCoverMeta(p.cover_alt).focal ?? 30,
    // The schema has no cover_height column, so the value rides in cover_alt.
    coverHeight: p.cover_height ?? stripCoverMeta(p.cover_alt).height,
    featured: Boolean(p.featured),
    readingMinutes: p.reading_minutes ?? 1,
    blocks: (Array.isArray(p.blocks) ? p.blocks : []) as Block[],
  };
}

function toPayload(d: EditorDraft) {
  return {
    title: d.title,
    slug: d.slug,
    summary: d.summary,
    status: d.status,
    topic_slug: d.category || null,
    tags: d.tags,
    cover_url: d.cover,
    cover_alt: d.coverAlt,
    cover_focal: d.coverFocal ?? 30,
    cover_height: d.coverHeight,
    date: d.date,
    reading_minutes: d.readingMinutes,
    blocks: d.blocks.map(({ __k, ...rest }: Block & { __k?: string }) => rest),
    featured: d.featured,
  };
}

const blockIcon = (d: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const BLOCK_PRESETS: {
  type: Block["type"];
  label: string;
  hint: string;
  group: "Text" | "Media" | "Structure" | "Data";
  keywords?: string;
  icon: React.ReactNode;
}[] = [
  { type: "p", label: "Text", hint: "A plain paragraph — just start writing", group: "Text", keywords: "paragraph body prose", icon: blockIcon("M4 7h16M4 12h16M4 17h10") },
  { type: "h2", label: "Heading", hint: "A section title readers can scan", group: "Text", keywords: "h2 title section", icon: blockIcon("M5 5v14M15 5v14M5 12h10") },
  { type: "h3", label: "Subheading", hint: "A smaller heading inside a section", group: "Text", keywords: "h3 subtitle", icon: blockIcon("M5 8v8M13 8v8M5 12h8") },
  { type: "quote", label: "Quote", hint: "Pull out a line worth repeating", group: "Text", keywords: "blockquote pull quote cite testimonial", icon: blockIcon("M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4") },
  { type: "callout", label: "Callout", hint: "A note, tip or warning", group: "Text", keywords: "note tip warning alert aside box", icon: blockIcon("M12 8v5M12 17h.01M3 5h18v14H3z") },
  { type: "list", label: "List", hint: "Bulleted or numbered points", group: "Text", keywords: "bullets ordered numbered checklist ul ol", icon: blockIcon("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01") },
  { type: "image", label: "Image", hint: "Upload a photo or link to one", group: "Media", keywords: "photo picture screenshot figure", icon: blockIcon("M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6") },
  { type: "imgtext", label: "Image + text", hint: "A photo beside a paragraph", group: "Media", keywords: "side by side float wrap split", icon: blockIcon("M3 5h7v14H3zM13 7h8M13 12h8M13 17h5") },
  { type: "row", label: "Media carousel", hint: "A swipeable strip of photos and clips", group: "Media", keywords: "gallery slider carousel strip", icon: blockIcon("M2 7h5v10H2zM9 7h6v10H9zM17 7h5v10h-5z") },
  { type: "video", label: "Video", hint: "YouTube, Vimeo or an MP4 upload", group: "Media", keywords: "youtube vimeo embed mp4 clip movie", icon: blockIcon("M3 6h18v12H3zM10 9.5l5 2.5-5 2.5z") },
  { type: "embed", label: "Embed", hint: "Paste a link that renders inline", group: "Media", keywords: "oembed tweet codepen spotify gist soundcloud", icon: blockIcon("M8 4h8l4 4v12H4V4zM16 4v4h4") },
  { type: "code", label: "Code", hint: "A snippet with a filename and language", group: "Media", keywords: "snippet pre terminal shell script", icon: blockIcon("M9 8l-4 4 4 4M15 8l4 4-4 4") },
  { type: "related", label: "Read next", hint: "Link another story as a card", group: "Structure", keywords: "card link related story recommendation", icon: blockIcon("M4 5h16v14H4zM8 9h8M8 13h5") },
  { type: "divider", label: "Divider", hint: "A clean break between ideas", group: "Structure", keywords: "hr line separator rule", icon: blockIcon("M3 12h18") },
  { type: "table", label: "Table", hint: "Rows and columns of data", group: "Data", keywords: "grid rows columns spreadsheet", icon: blockIcon("M3 5h18v14H3zM3 10h18M3 15h18M9 5v14") },
  { type: "stats", label: "Stats", hint: "A row of big numbers with captions", group: "Data", keywords: "stats numbers figures pull quote metrics kpi", icon: blockIcon("M4 19V9M10 19V5M16 19v-7M22 19H2") },
  { type: "timestrip", label: "Timeline", hint: "A horizontal strip of dated moments", group: "Structure", keywords: "timeline history dates milestones chronology", icon: blockIcon("M3 12h18M7 12a2 2 0 1 0 0 .01M17 12a2 2 0 1 0 0 .01") },
  { type: "bafter", label: "Before / after", hint: "A draggable slider comparing two photos", group: "Media", keywords: "before after slider compare transform image", icon: blockIcon("M12 3v18M3 5h18v14H3zM7 12l-2 2 2 2M17 12l2 2-2 2") },
  { type: "accordion", label: "FAQ", hint: "Collapsible questions and answers", group: "Text", keywords: "faq questions answers accordion details collapsible", icon: blockIcon("M4 6h16M4 12h16M4 18h10") },
  { type: "steps", label: "Steps", hint: "A numbered walkthrough", group: "Structure", keywords: "how to tutorial numbered guide process", icon: blockIcon("M7 5h13M7 12h13M7 19h13M3 5h.01M3 12h.01M3 19h.01") },
  { type: "proscons", label: "Pros and cons", hint: "Two columns weighing a decision", group: "Structure", keywords: "pros cons tradeoffs comparison verdict", icon: blockIcon("M4 5h7v14H4zM13 5h7v14h-7z") },
  { type: "glossary", label: "Glossary", hint: "Terms with short definitions", group: "Data", keywords: "terms definitions dictionary glossary jargon", icon: blockIcon("M5 4h11l3 3v13H5zM8 9h7M8 13h7") },
  { type: "diff", label: "Before / after code", hint: "Two code panes side by side", group: "Data", keywords: "diff patch code compare old new refactor", icon: blockIcon("M4 5h7v14H4zM13 5h7v14h-7zM7 9l-1 1 1 1") },
  { type: "person", label: "Person card", hint: "A named quote or contributor", group: "Structure", keywords: "author person profile contributor bio avatar testimonial", icon: blockIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6") },
  { type: "progress", label: "Progress bar", hint: "A labelled percentage meter", group: "Data", keywords: "progress meter percent bar loading score completion", icon: blockIcon("M3 12h18M3 12a0 0 0 0 0 0 0M7 8v8M12 8v8M17 8v8") },
  { type: "linkcards", label: "Link cards", hint: "Clickable resource tiles", group: "Structure", keywords: "links resources cards external references buttons grid", icon: blockIcon("M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z") },
  { type: "compare", label: "Comparison table", hint: "Feature rows across two options", group: "Data", keywords: "compare versus table checkmark feature matrix a b", icon: blockIcon("M4 5h16M4 12h16M4 19h16M9 5v14M15 5v14") },
  { type: "countdown", label: "Countdown", hint: "Live timer to a date", group: "Media", keywords: "countdown timer event launch date live days hours", icon: blockIcon("M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 10v4l3 2") },
  { type: "keypoints", label: "Key takeaways", hint: "A short checklist readers can scan", group: "Data", keywords: "summary checklist takeaways tl;dr bullets", icon: blockIcon("M4 6.5 6 8.5 9 5M4 12.5 6 14.5 9 11M12 6.5h8M12 13h8M12 19h5") },
  { type: "chart", label: "Chart", hint: "Bars, lines, pies, stats and flows", group: "Data", keywords: "graph data viz stats funnel gauge timeline", icon: blockIcon("M4 20V10M10 20V4M16 20v-7M22 20H2") },
];

type Preset = (typeof BLOCK_PRESETS)[number];

function searchPresets(presets: Preset[], query: string): Preset[] {
  const q = query.trim().toLowerCase();
  if (!q) return presets;
  return presets.filter((b) => `${b.label} ${b.hint} ${b.group} ${b.type} ${b.keywords ?? ""}`.toLowerCase().includes(q));
}

const RECENT_KEY = "studio:recent-blocks";

function readRecent(): Block["type"][] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((t): t is Block["type"] => BLOCK_PRESETS.some((b) => b.type === t)).slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function rememberBlock(type: Block["type"]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([type, ...readRecent().filter((t) => t !== type)].slice(0, 3)));
  } catch {
    // Private mode or a full quota — recents are a nicety, not a requirement.
  }
}

/** One-line preview of a block for the sidebar list. */
function blockSummary(block: Block): string {
  const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  const text = (() => {
    switch (block.type) {
      case "h2":
      case "h3":
        return block.text;
      case "p":
      case "quote":
      case "callout":
        return plain(block.html);
      case "list":
      case "keypoints":
        return block.items.map(plain).filter(Boolean).join(", ");
      case "code":
        return block.filename || block.lang;
      case "image":
      case "imgtext":
        return block.alt;
      case "video":
        return block.url;
      case "embed":
        return block.url;
      case "related":
        return block.title || block.slug;
      case "cta":
        return block.label;
      case "table":
        return block.head.join(" · ");
      case "chart":
        return block.chart.title ?? block.chart.kind;
      case "stats":
        return block.items.map((i) => i.value).join(" · ");
      case "timestrip":
        return block.title ?? "";
      case "bafter":
        return block.labelBefore ? `${block.labelBefore} / ${block.labelAfter ?? ""}` : "";
      case "row":
        return `${block.items.length} slides`;
      case "footnote":
        return block.text;
      case "accordion":
        return `${block.items.length} question${block.items.length === 1 ? "" : "s"}`;
      case "steps":
        return block.items.map((i) => i.title).filter(Boolean).join(" → ");
      case "proscons":
        return `${block.pros.length} pro · ${block.cons.length} con`;
      case "glossary":
        return block.terms.map((t) => t.term).filter(Boolean).join(", ");
      case "diff":
        return block.filename || "Before / after";
      case "person":
        return [block.name, block.role].filter(Boolean).join(" — ");
      case "progress":
        return `${block.label || "Progress"} · ${Math.round((block.value / (block.max || 100)) * 100)}%`;
      case "linkcards":
        return `${block.items.length} link${block.items.length === 1 ? "" : "s"}`;
      case "compare":
        return `${block.columns[0]} vs ${block.columns[1]}`;
      case "countdown":
        return block.label || block.date;
      default:
        return "";
    }
  })();
  return text.length > 64 ? `${text.slice(0, 64).trimEnd()}…` : text;
}

const blockLabel = (type: Block["type"]) => BLOCK_PRESETS.find((b) => b.type === type)?.label ?? "Block";

/** What a pasted bare URL should become — or null to keep it as text/link. */
function urlBlockKind(url: string): "image" | "embed" | null {
  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url) || /imgur\.com\//.test(url)) return "image";
  if (/(youtube\.com|youtu\.be|vimeo\.com\/)\S+/.test(url)) return "embed";
  if (/(open\.spotify\.com|codepen\.io|soundcloud\.com|w\.soundcloud\.com|maps\.google\.|gist\.github\.com|docs\.google\.com)/.test(url)) return "embed";
  return null;
}

/** True for an empty or only-whitespace rich-text paragraph. */
function richIsEmpty(html: string): boolean {
  return html.replace(/&nbsp;/g, " ").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").trim().length === 0;
}

function newBlock(type: Block["type"]): Block {
  switch (type) {
    case "h2":
    case "h3":
      return { type, text: "", id: "" };
    case "quote":
      return { type, html: "" };
    case "callout":
      return { type, tone: "note", html: "", title: "" };
    case "list":
      return { type, ordered: false, items: [""] };
    case "code":
      return { type, lang: "ts", code: "", filename: "" };
    case "image":
      return { type, src: "", alt: "", caption: "" };
    case "row":
      return { type, items: [{ src: "", alt: "" }, { src: "", alt: "" }], columns: 2, caption: "" };
    case "video":
      return { type, url: "", caption: "" };
    case "related":
      return { type, slug: "", title: "", description: "", image: "" };
    case "table":
      return { type, head: ["Column", "Column"], rows: [["", ""]] };
    case "chart":
      return { type, chart: defaultChart("column") };
    case "imgtext":
      return { type, src: "", alt: "", html: "", side: "left" };
    case "embed":
      return { type, url: "", caption: "" };
    case "keypoints":
      return { type, title: "Key takeaways", items: [""] };
    case "cta":
      return { type, label: "", href: "" };
    case "footnote":
      return { type, text: "" };
    case "stats":
      return { type, items: [{ value: "", label: "" }, { value: "", label: "" }], columns: 3 };
    case "timestrip":
      return { type, items: [{ date: "", title: "" }], title: "" };
    case "bafter":
      return { type, before: "", after: "", labelBefore: "Before", labelAfter: "After" };
    case "accordion":
      return { type, title: "Questions", items: [{ q: "", html: "" }] };
    case "steps":
      return { type, title: "", items: [{ title: "", detail: "" }] };
    case "proscons":
      return { type, pros: [""], cons: [""], prosLabel: "Worth it", consLabel: "Trade-offs" };
    case "glossary":
      return { type, title: "Terms", terms: [{ term: "", def: "" }] };
    case "diff":
      return { type, before: "", after: "", filename: "" };
    case "person":
      return { type, name: "", role: "", avatar: "", html: "", links: [] };
    case "progress":
      return { type, label: "", value: 60, max: 100, unit: "%", note: "" };
    case "linkcards":
      return { type, title: "Resources", items: [{ title: "", href: "", desc: "" }] };
    case "compare":
      return { type, columns: ["Option A", "Option B"], rows: [{ feature: "", a: "", b: "" }] };
    case "countdown":
      return { type, label: "Launching in", date: "", note: "" };
    case "divider":
      return { type };
    default:
      return { type: "p", html: "" };
  }
}

const TOUT_SWATCHES = [
  { id: "blue", label: "Blue", css: "linear-gradient(227deg,#f0f6ff,#d9e7fd)" },
  { id: "green", label: "Green", css: "linear-gradient(227deg,#f1faf3,#d8efdd)" },
  { id: "mint", label: "Mint", css: "linear-gradient(227deg,#effaf6,#d3efe6)" },
  { id: "yellow", label: "Yellow", css: "linear-gradient(227deg,#fdf8ec,#f8e7bd)" },
  { id: "red", label: "Red", css: "linear-gradient(227deg,#fef4f2,#fadcd7)" },
  { id: "purple", label: "Purple", css: "linear-gradient(227deg,#f8f5ff,#e8dcfb)" },
  { id: "gray", label: "Gray", css: "linear-gradient(227deg,#f8f9fa,#eceef0)" },
];

export function PostEditor({ postId }: { postId: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const topicsC = useApiCollection<ApiTopic>("/api/admin/topics", "topics");
  const albumsC = useApiCollection<ApiAlbum>("/api/admin/albums", "albums");
  const uploadsC = useApiCollection<ApiUpload>("/api/admin/upload", "files");
  const postsC = useApiCollection<{ id: string; title: string; slug: string; summary: string; cover_url: string | null }>("/api/admin/posts", "posts");
  const [authorName, setAuthorName] = useState("Bishnu Neupane");
  useEffect(() => {
    api.get<{ payload?: { identity?: { authorName?: string } } }>("/api/admin/settings")
      .then((d) => d.payload?.identity?.authorName && setAuthorName(d.payload.identity.authorName))
      .catch(() => {});
  }, []);
  const imageOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { src: string; label: string }[] = [];
    for (const u of uploadsC.items) if (u.type.startsWith("image/") && !seen.has(u.src)) { seen.add(u.src); opts.push({ src: u.src, label: `Media — ${u.name}` }); }
    for (const a of albumsC.items) if (a.cover_url && !seen.has(a.cover_url)) { seen.add(a.cover_url); opts.push({ src: a.cover_url, label: `${a.title} — cover` }); }
    return opts;
  }, [uploadsC.items, albumsC.items]);
  const state = {
    topics: topicsC.items.map((t) => ({ slug: t.slug, name: t.name })),
  };
  const [existing, setExisting] = useState<ApiPost | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mailing, setMailing] = useState(false);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState<"write" | "preview" | "settings" | "insights">("write");
  const [dirty, setDirty] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [paletteAfter, setPaletteAfter] = useState<number | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActive, setPaletteActive] = useState(0);
  const [recentBlocks, setRecentBlocks] = useState<Block["type"][]>([]);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const slugTouched = useRef(Boolean(postId && postId !== "new"));

  /* Revision history — snapshots are taken server-side on every save; this
     lists them and restores one by PATCHing the stored snapshot back. */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<{ id: string; title: string; status: string; created_at: string }[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function loadRevisions() {
    if (!existing) return;
    setRevisionsLoading(true);
    setRevisionsError("");
    try {
      const res = await api.get<{ revisions: typeof revisions; needsSetup?: boolean }>(`/api/admin/posts/${existing.id}/revisions`);
      setRevisions(res.revisions ?? []);
      if (res.needsSetup) {
        setRevisionsError("Revision history needs one table — run the fn_post_revisions block from supabase/schema.sql once, then reopen this panel.");
      }
    } catch (e) {
      setRevisionsError(e instanceof Error ? e.message : "Could not load revisions");
    } finally {
      setRevisionsLoading(false);
    }
  }

  function openHistory() {
    setHistoryOpen(true);
    void loadRevisions();
  }

  async function restoreRevision(revisionId: string) {
    if (!existing || restoringId) return;
    const ok = await confirm({
      title: "Restore this version?",
      body: "The current content is snapshotted first, so you can undo a restore.",
      confirmLabel: "Restore version",
    });
    if (!ok) return;
    setRestoringId(revisionId);
    try {
      const res = await api.post<{ post: ApiPost }>(`/api/admin/posts/${existing.id}/revisions`, { revisionId });
      setExisting(res.post);
      setDraft(toDraft(res.post));
      setDirty(false);
      setHistoryOpen(false);
      toast("Version restored", "success");
      await loadRevisions();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not restore that version");
    } finally {
      setRestoringId(null);
    }
  }

  useEffect(() => {
    let alive = true;
    if (!postId || postId === "new") {
      setDraft({
        id: "new",
        title: "",
        slug: "",
        summary: "",
        status: "draft",
        date: new Date().toISOString().slice(0, 10),
        category: "",
        tags: [],
        cover: null,
        coverAlt: "",
        coverFocal: 30,
        coverHeight: null,
        featured: false,
        readingMinutes: 1,
        blocks: [{ type: "p", html: "" }],
      });
      return;
    }
    api.get<{ post: ApiPost }>(`/api/admin/posts/${postId}`)
      .then((data) => { if (alive) { setExisting(data.post); setDraft({ ...toDraft(data.post), blocks: toDraft(data.post).blocks.map((b) => ({ ...b, __k: Math.random().toString(36).slice(2) })) as unknown as Block[] }); } })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Failed to load"));
    return () => { alive = false; };
  }, [postId]);

  const words = useMemo(() => {
    if (!draft) return 0;
    return draft.blocks
      .map((b) => ("html" in b ? b.html : "text" in b ? b.text : "code" in b ? b.code : "items" in b ? b.items.join(" ") : ""))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .split(/\s+/)
      .filter(Boolean).length;
  }, [draft]);

  const paletteResults = useMemo(() => {
    return searchPresets(BLOCK_PRESETS, paletteQuery);
  }, [paletteQuery]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft?.title, tab]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft?.summary, tab]);

  /* Warn before a tab close, and before any in-app link, when work is unsaved. */
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/") || href === window.location.pathname) return;
      event.preventDefault();
      const go = () => window.location.assign(href);
      void confirm({
        title: "Leave without saving?",
        body: "This post has changes that were not saved yet.",
        confirmLabel: "Leave",
        cancelLabel: "Keep editing",
      }).then((leave) => {
        if (leave) go();
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, confirm]);

  if (loadError) {
    return (
      <div className={styles.missing}>
        <p>{loadError}</p>
        <Link href="/admin/posts" className="btn btn-primary">Back to posts</Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className={styles.missing}>
        <p>Loading editor…</p>
      </div>
    );
  }

  function patch(p: Partial<EditorDraft>) {
    setDirty(true);
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function patchBlock(i: number, block: Block) {
    setDirty(true);
    setDraft((d) => (d ? { ...d, blocks: d.blocks.map((b, idx) => (idx === i ? block : b)) } : d));
  }

  function removeBlock(i: number) {
    setDirty(true);
    setDraft((d) => (d ? { ...d, blocks: d.blocks.filter((_, idx) => idx !== i) } : d));
  }

  function moveBlock(i: number, dir: -1 | 1) {
    setDirty(true);
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, blocks: next };
    });
  }

  function reorderBlocks(from: number, to: number) {
    if (from === to) return;
    setDirty(true);
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...d, blocks: next };
    });
  }

  function openPalette(after: number) {
    setRecentBlocks(readRecent());
    setPaletteAfter(after);
    setPaletteQuery("");
    setPaletteActive(0);
  }

  function closePalette() {
    setPaletteAfter(null);
    setPaletteQuery("");
  }

  function insertBlock(i: number, type: Block["type"]) {
    setDirty(true);
    rememberBlock(type);
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      next.splice(i + 1, 0, { ...newBlock(type), __k: Math.random().toString(36).slice(2) } as unknown as Block);
      return { ...d, blocks: next };
    });
    closePalette();
    window.setTimeout(() => {
      const node = document.querySelector<HTMLElement>(`[data-block-index="${i + 1}"]`);
      node?.querySelector<HTMLElement>("input, textarea, [contenteditable='true']")?.focus();
    }, 30);
  }

  /** Smart paste: swap an (almost) empty paragraph for the media block it should be. */
  function replaceParagraphWithBlock(i: number, pBlock: { type: "p"; html: string }, kind: "image" | "embed") {
    const node = document.querySelector<HTMLElement>(`[data-block-index="${i}"] [contenteditable='true']`);
    const url = node?.textContent?.trim() ?? "";
    if (!url || !/^https?:\/\/\S+$/.test(url) || !urlBlockKind(url)) return;
    setDirty(true);
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      const replacement: Block =
        kind === "image" ? { type: "image", src: url, alt: "" } : { type: "embed", url, caption: "" };
      const keepK = (pBlock as unknown as { __k?: string }).__k ?? Math.random().toString(36).slice(2);
      next.splice(i, 1, ...(richIsEmpty(pBlock.html)
        ? [{ ...replacement, __k: keepK } as unknown as Block]
        : [pBlock as unknown as Block, { ...replacement, __k: Math.random().toString(36).slice(2) } as unknown as Block]));
      return { ...d, blocks: next };
    });
  }

  /** Duplicate a block in place. */
  function duplicateBlock(i: number) {
    setDirty(true);
    setDraft((d) => {
      if (!d) return d;
      const copy = { ...d.blocks[i], __k: Math.random().toString(36).slice(2) } as unknown as Block;
      const next = [...d.blocks];
      next.splice(i + 1, 0, copy);
      return { ...d, blocks: next };
    });
  }

  async function mailPost(test: boolean) {
    if (!draft) return;
    setMailing(true);
    try {
      const res = await api.post<{ sent: number; failed?: number; message?: string; error?: string }>(
        `/api/admin/posts/${draft.id}/mail`,
        { slug: draft.slug, test },
      );
      if (res.message) toast(res.message);
      else toast(test ? `Test email sent` : `Emailed ${res.sent} subscriber${res.sent === 1 ? "" : "s"}`, "success");
      if (res.failed) toast(`${res.failed} could not be delivered`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Mailout failed");
    } finally {
      setMailing(false);
    }
  }

  async function save(status?: ApiPost["status"]) {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const next: EditorDraft = {
        ...draft,
        status: status ?? draft.status,
        slug: draft.slug || slugifyTitle(draft.title) || `post-${Date.now()}`,
        readingMinutes: Math.max(1, Math.round(words / 220)),
      };
      const isNew = !existing;
      const data = isNew
        ? await api.post<{ post: ApiPost }>("/api/admin/posts", toPayload(next))
        : await api.patch<{ post: ApiPost }>(`/api/admin/posts/${next.id}`, toPayload(next));
      setExisting(data.post);
      setDraft({ ...toDraft(data.post) });
      setDirty(false);
      if (next.featured && next.status === "published") {
        // One lead story only — un-feature everything else.
        try {
          await api.post("/api/admin/posts/unfeature-others", { id: data.post.id });
        } catch {
          /* cosmetic; retry on next save */
        }
      }
      setSaved(next.status === "published" ? "Published" : "Saved");
      toast(next.status === "published" ? "Post published" : "Post saved", "success");
      setTimeout(() => setSaved(null), 1800);

      // First time this post goes live, tell subscribers. Re-saving a published
      // post (or publishing a draft that was already mailed) must not re-send.
      const newlyPublished = next.status === "published" && existing?.status !== "published";
      if (newlyPublished) {
        api
          .post<{ sent?: number; failed?: number }>(`/api/admin/posts/${data.post.id}/mail`, { slug: data.post.slug })
          .then((r) => {
            if (r?.sent) toast(`Emailed ${r.sent} subscriber${r.sent === 1 ? "" : "s"}`, "success");
          })
          .catch(() => {
            /* the manual Mail button covers retries */
          });
      }
      if (isNew) {
        // Replace the URL without a route change so the editor state survives.
        window.history.replaceState(null, "", `/admin/posts/${data.post.id}/edit`);
      } else if (status === "published") {
        router.refresh();
        router.push("/admin/posts");
      } else {
        router.refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setSaveError(message);
      toast(message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadCoverFile(file: File) {
    try {
      const r = await api.upload(file);
      patch({ cover: r.src, coverAlt: draft?.coverAlt || "Cover image" });
      uploadsC.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const quality = runChecks({
    title: draft.title,
    slug: draft.slug,
    summary: draft.summary,
    cover: draft.cover,
    coverAlt: draft.coverAlt,
    blocks: draft.blocks,
    tags: draft.tags,
    category: draft.category,
    words,
  });
  const qualityScore = scoreChecks(quality);
  const outline = outlineOf(draft.blocks);
  const issues = quality.filter((c) => c.level !== "pass").length;
  const readMinutes = Math.max(1, Math.round(words / 220));

  function jumpToBlock(index: number) {
    const node = document.querySelector<HTMLElement>(`[data-block-index="${index}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.querySelector<HTMLElement>("input, textarea, [contenteditable='true']")?.focus({ preventScroll: true });
  }

  const topicName = state.topics.find((t) => t.slug === draft.category)?.name ?? draft.category;
  const dateLabel = draft.date
    ? new Date(`${draft.date}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "No date yet";
  const authorInitials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      className={styles.editor}
      onKeyDown={(e) => {
        const mod = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();
        const typing = /^(input|textarea|select|\/)/i.test((e.target as HTMLElement | null)?.tagName ?? "") || (e.target as HTMLElement | null)?.isContentEditable;

        if (mod && key === "s") {
          e.preventDefault();
          if (!saving) void save("draft");
        } else if (mod && key === "enter") {
          e.preventDefault();
          if (!saving) void save("published");
        } else if (mod && key === "k") {
          e.preventDefault();
          openPalette(activeBlock ?? draft.blocks.length - 1);
        } else if (mod && key === "d" && !typing && activeBlock !== null) {
          e.preventDefault();
          duplicateBlock(activeBlock);
        } else if (e.altKey && (key === "arrowup" || key === "arrowdown") && activeBlock !== null) {
          e.preventDefault();
          moveBlock(activeBlock, key === "arrowup" ? -1 : 1);
        } else if (mod && /^[1-4]$/.test(key) && !typing) {
          e.preventDefault();
          setTab((["write", "settings", "insights", "preview"] as const)[Number(key) - 1]);
        } else if (e.key === "Escape" && paletteAfter !== null) {
          closePalette();
        }
      }}
    >
      <header className={styles.commandBar}>
        <div className={styles.barLeft}>
          <Link href="/admin/posts" className={styles.backBtn} aria-label="Back to all posts" title="All posts">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <span className={styles.crumbDivider} aria-hidden="true" />
          <div className={styles.crumb}>
            <span className={styles.crumbKicker}>Posts</span>
            <span className={styles.crumbTitle}>{draft.title || "Untitled story"}</span>
          </div>
          <span className={styles.statusWrap}>
            <StatusChip status={draft.status} tone={statusTone(draft.status)} />
          </span>
        </div>

        <div className={styles.viewSwitch} role="tablist" aria-label="Editor view">
          {([
            { id: "write", label: "Write", badge: null, icon: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /> },
            { id: "settings", label: "Settings", badge: null, icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></> },
            { id: "insights", label: "Insights", badge: issues || null, icon: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /> },
            { id: "preview", label: "Preview", badge: null, icon: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" /></> },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? styles.viewSwitchOn : styles.viewSwitchBtn}
              onClick={() => setTab(item.id)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              {item.label}
              {item.badge ? <span className={styles.tabBadge}>{item.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className={styles.barActions}>
          <span className={styles.saveState} aria-live="polite">
            {saveError ? (
              <span className={styles.saveError}>{saveError}</span>
            ) : saving ? (
              "Saving…"
            ) : dirty ? (
              <>
                <span className={styles.dirtyDot} aria-hidden="true" />
                Unsaved changes
              </>
            ) : saved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
                {saved}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
                {existing ? "All changes saved" : "New draft"}
              </>
            )}
          </span>
          <button type="button" className={styles.settingsToggle} aria-label="Open post settings" title="Post settings" onClick={() => setTab("settings")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
            </svg>
          </button>
          <Button variant="outlined" size="sm" className={styles.saveDraft} onClick={() => save("draft")} disabled={saving}>
            Save draft
          </Button>
          <Button size="sm" onClick={() => save("published")} disabled={saving}>
            {saving ? "Working…" : "Publish"}
          </Button>
          <details className={styles.more}>
            <summary className={styles.iconBtn} title="More actions">
              <span className={styles.srOnly}>More actions</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="12" cy="19" r="1.7" />
              </svg>
            </summary>
            <div className={styles.morePanel}>
              {existing ? (
                <Link href={`/blog/${draft.slug}`} target="_blank" rel="noreferrer noopener" className={styles.moreItem}>
                  View live
                </Link>
              ) : null}
              {existing ? (
                <button
                  type="button"
                  className={styles.moreItem}
                  disabled={mailing}
                  onClick={() => mailPost(false)}
                >
                  {mailing ? "Sending…" : "Mail post to subscribers"}
                </button>
              ) : null}
              {existing ? (
                <button
                  type="button"
                  className={styles.moreItem}
                  disabled={mailing}
                  onClick={() => mailPost(true)}
                >
                  Send test to me
                </button>
              ) : null}
              <button type="button" className={`${styles.moreItem} ${styles.moreMobile}`} onClick={() => setTab("settings")}>
                Post details
              </button>
              {existing ? (
                <button type="button" className={styles.moreItem} onClick={openHistory}>
                  Revision history
                </button>
              ) : null}
              <button type="button" className={`${styles.moreItem} ${styles.moreMobile}`} onClick={() => save("draft")} disabled={saving}>
                Save draft
              </button>
              {existing ? (
                <button
                  type="button"
                  className={styles.moreItemDanger}
                  onClick={async () => {
                    if (!window.confirm(`Delete “${draft.title || "this post"}”? This cannot be undone.`)) return;
                    try {
                      await api.del(`/api/admin/posts/${draft.id}?hard=1`);
                      router.push("/admin/posts");
                      router.refresh();
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  Delete post
                </button>
              ) : null}
            </div>
          </details>
        </div>
      </header>

      <div className={styles.workspace}>
        <main className={styles.canvas}>
          {tab === "settings" ? (
            <section className={styles.settingsPage} aria-label="Post settings">
              <header className={styles.pageHead}>
                <h2 className={styles.pageTitle}>Post settings</h2>
                <p className={styles.pageLede}>Publishing, cover, taxonomy and prominence. Changes save with the post.</p>
              </header>
              <SettingsPanel
                draft={draft}
                patch={patch}
                slugTouched={slugTouched}
                topics={state.topics}
                authorName={authorName}
                coverOptions={(uploadsC.items ?? []).filter((u) => u.type.startsWith("image/"))}
                onUploadCover={async (file: File) => {
                  const r = await api.upload(file);
                  uploadsC.reload();
                  return r.src;
                }}
              />
            </section>
          ) : tab === "insights" ? (
            <InsightsPage
              checks={quality}
              score={qualityScore}
              words={words}
              readMinutes={readMinutes}
              onJump={jumpToBlock}
            />
          ) : (
          <article className={styles.paper}>
            {tab === "preview" ? (
              <Preview draft={draft} authorName={authorName} topicName={topicName} dateLabel={dateLabel} words={words} />
            ) : (
              <>
                <header className={styles.docHead}>
                  <div className={styles.kickerRow}>
                    <span className={styles.kickerTag}>{topicName || "Uncategorised"}</span>
                    <span className={styles.kickerMeta}>{dateLabel}</span>
                  </div>
                  <textarea
                    ref={titleRef}
                    rows={1}
                    className={styles.title}
                    value={draft.title}
                    placeholder="Untitled story"
                    aria-label="Post title"
                    onChange={(e) => {
                      patch({ title: e.target.value });
                      if (!slugTouched.current) patch({ slug: slugifyTitle(e.target.value) });
                    }}
                  />
                  <textarea
                    ref={descRef}
                    className={styles.desc}
                    value={draft.summary}
                    placeholder="Add a standfirst — the one sentence readers see on cards, in search and at the top of the page."
                    rows={2}
                    aria-label="Standfirst"
                    onChange={(e) => patch({ summary: e.target.value })}
                  />
                  <div className={styles.byline}>
                    <span className={styles.avatar} aria-hidden="true">{authorInitials}</span>
                    <div className={styles.bylineMeta}>
                      <strong>{authorName}</strong>
                      <span>{words} words · ~{Math.max(1, Math.round(words / 220))} min read</span>
                    </div>
                  </div>

                  {draft.cover ? (
                    <figure className={styles.coverHero}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.cover} alt={draft.coverAlt} />
                      <div className={styles.coverHeroActions}>
                        <label className={styles.coverHeroBtn}>
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (f) await uploadCoverFile(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button type="button" className={styles.coverHeroBtn} onClick={() => patch({ cover: null })}>
                          Remove
                        </button>
                      </div>
                    </figure>
                  ) : (
                    <label className={styles.addCover}>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) await uploadCoverFile(f);
                          e.target.value = "";
                        }}
                      />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                        <circle cx="9" cy="10" r="1.6" />
                        <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                      </svg>
                      Add a cover image
                    </label>
                  )}
                </header>

                <div className={styles.blocks} aria-label="Story blocks">
                  {draft.blocks.map((block, i) => {
                    const blockClass = [
                      styles.block,
                      activeBlock === i ? styles.blockActive : "",
                      dragOver === i ? styles.blockDragOver : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <div
                        key={(block as { __k?: string }).__k ?? `b${i}`}
                        className={blockClass}
                        data-block-index={i}
                        onClickCapture={() => setActiveBlock(i)}
                        onFocusCapture={() => setActiveBlock(i)}
                        onBlurCapture={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setActiveBlock((current) => (current === i ? null : current));
                          }
                        }}
                        onDragOver={(e) => {
                          if (dragFrom.current === null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOver !== i) setDragOver(i);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setDragOver((current) => (current === i ? null : current));
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFrom.current !== null) reorderBlocks(dragFrom.current, i);
                          dragFrom.current = null;
                          setDragOver(null);
                        }}
                      >
                        <div className={styles.blockGutter}>
                          <button
                            type="button"
                            className={styles.gutterHandle}
                            draggable
                            aria-label="Drag to reorder block"
                            title="Drag to reorder"
                            onDragStart={(e) => {
                              dragFrom.current = i;
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(i));
                            }}
                            onDragEnd={() => {
                              dragFrom.current = null;
                              setDragOver(null);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <circle cx="9" cy="6" r="1.4" />
                              <circle cx="15" cy="6" r="1.4" />
                              <circle cx="9" cy="12" r="1.4" />
                              <circle cx="15" cy="12" r="1.4" />
                              <circle cx="9" cy="18" r="1.4" />
                              <circle cx="15" cy="18" r="1.4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={styles.gutterAdd}
                            aria-label="Insert a block here"
                            title="Insert block"
                            onClick={() => openPalette(i)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </button>
                        </div>
                        <div className={styles.blockBody} data-block-type={block.type}>
                          <BlockEditor
                            block={block}
                            onChange={(b) => patchBlock(i, b)}
                            imageOptions={imageOptions}
                            postOptions={postsC.items.filter((p) => p.slug !== draft?.slug).map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, cover: p.cover_url ?? "" }))}
                            onOpenPaletteInsert={activeBlock === i ? () => openPalette(i) : undefined}
                            onImportUrl={activeBlock === i ? (pBlock, kind) => replaceParagraphWithBlock(i, pBlock, kind) : undefined}
                          />
                        </div>
                        <div className={styles.blockTools}>
                          <span className={styles.blockType}>{blockLabel(block.type)}</span>
                          <button type="button" className={styles.toolBtn} onClick={() => openPalette(i)} aria-label="Insert block after" title="Insert block">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                          </button>
                          <button type="button" className={styles.toolBtn} onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Move block up" title="Move up">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                          </button>
                          <button type="button" className={styles.toolBtn} onClick={() => moveBlock(i, 1)} disabled={i === draft.blocks.length - 1} aria-label="Move block down" title="Move down">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                          </button>
                          <button type="button" className={styles.toolBtn} onClick={() => duplicateBlock(i)} aria-label="Duplicate block" title="Duplicate block">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          </button>
                          <button type="button" className={`${styles.toolBtn} ${styles.toolBtnDanger}`} onClick={() => removeBlock(i)} aria-label="Delete block" title="Delete block">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.insertBar}>
                  <button type="button" className={styles.insertBtn} onClick={() => openPalette(draft.blocks.length - 1)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add block
                  </button>
                </div>

                <footer className={styles.docFooter}>
                  <span>{words} words</span>
                  <span className={styles.docDot} aria-hidden="true" />
                  <span>~{Math.max(1, Math.round(words / 220))} min read</span>
                  <span className={styles.docDot} aria-hidden="true" />
                  <span>{draft.blocks.length} blocks</span>
                  <span className={styles.docShortcut}>
                    <kbd>⌘</kbd><kbd>S</kbd> save
                  </span>
                </footer>
              </>
            )}
          </article>
          )}
        </main>

        <aside className={styles.sideRail} aria-label="Editor sidebar">
          <div className={styles.railTabs} role="tablist" aria-label="Sidebar view">
            <button
              type="button"
              role="tab"
              aria-selected={tab !== "insights"}
              className={tab !== "insights" ? styles.railTabOn : styles.railTab}
              onClick={() => setTab("write")}
            >
              Blocks
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "insights"}
              className={tab === "insights" ? styles.railTabOn : styles.railTab}
              onClick={() => setTab("insights")}
            >
              Outline
            </button>
          </div>

          {tab === "insights" ? (
            <div className={styles.railBody}>
              <div className={styles.railStats}>
                <span><strong>{words.toLocaleString()}</strong> words</span>
                <span><strong>{readMinutes}</strong> min</span>
                <span><strong>{draft.blocks.length}</strong> blocks</span>
              </div>
              <OutlineList items={outline} onJump={jumpToBlock} />
            </div>
          ) : (
            <div className={styles.railBody}>
              <div className={styles.railStats}>
                <span><strong>{qualityScore.passed}/{qualityScore.total}</strong> checks</span>
                <span><strong>{draft.blocks.length}</strong> blocks</span>
                <span><strong>{outline.length}</strong> headings</span>
              </div>
              <button type="button" className={styles.railAdd} onClick={() => openPalette(draft.blocks.length - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Add block
              </button>
              <ul className={styles.railBlocks}>
                {draft.blocks.map((block, i) => (
                  <li key={i} className={activeBlock === i ? `${styles.railBlock} ${styles.railBlockOn}` : styles.railBlock}>
                    <button type="button" className={styles.railBlockBtn} onClick={() => jumpToBlock(i)}>
                      <span className={styles.railBlockIndex}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={styles.railBlockLabel}>{blockLabel(block.type)}</span>
                      <span className={styles.railBlockText}>{blockSummary(block)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.railFoot}>
                <button type="button" className={styles.railFootBtn} onClick={() => setTab("insights")}>
                  Show outline
                </button>
                <button type="button" className={styles.railFootBtn} onClick={() => setTab("settings")}>
                  Post settings
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {paletteAfter !== null ? (
        <div
          className={styles.paletteOverlay}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePalette();
          }}
        >
          <div className={styles.paletteDialog} role="dialog" aria-modal="true" aria-label="Insert block">
            <div className={styles.paletteSearchWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                autoFocus
                className={styles.paletteSearch}
                type="search"
                value={paletteQuery}
                placeholder="Search blocks…"
                aria-label="Search blocks"
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closePalette();
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setPaletteActive((current) => (paletteResults.length ? (current + 1) % paletteResults.length : 0));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setPaletteActive((current) => (paletteResults.length ? (current - 1 + paletteResults.length) % paletteResults.length : 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const preset = paletteResults[paletteActive];
                    if (preset && paletteAfter !== null) insertBlock(paletteAfter, preset.type);
                  }
                }}
              />
              <kbd className={styles.paletteKbd}>esc</kbd>
            </div>
            <div className={styles.paletteList} role="listbox" aria-label="Blocks">
              {!paletteQuery.trim() && recentBlocks.length ? (
                <div className={styles.paletteQuick}>
                  <p className={styles.paletteGroup}>Recent</p>
                  <div className={styles.paletteQuickRow}>
                    {recentBlocks.map((type) => {
                      const preset = BLOCK_PRESETS.find((b) => b.type === type);
                      if (!preset) return null;
                      return (
                        <button
                          key={type}
                          type="button"
                          className={styles.paletteQuickChip}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (paletteAfter !== null) insertBlock(paletteAfter, type);
                          }}
                        >
                          {preset.icon}
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {paletteResults.length === 0 ? (
                <p className={styles.paletteEmpty}>No blocks match “{paletteQuery}”.</p>
              ) : (
                paletteResults.map((preset, i) => (
                  <div key={preset.type}>
                    {i === 0 || preset.group !== paletteResults[i - 1].group ? (
                      <p className={styles.paletteGroup}>{preset.group}</p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === paletteActive}
                      className={i === paletteActive ? `${styles.paletteItem} ${styles.paletteItemActive}` : styles.paletteItem}
                      onMouseEnter={() => setPaletteActive(i)}
                      onClick={() => {
                        if (paletteAfter !== null) insertBlock(paletteAfter, preset.type);
                      }}
                    >
                      <span className={styles.paletteIcon}>{preset.icon}</span>
                      <span className={styles.paletteText}>
                        <span className={styles.paletteLabel}>{preset.label}</span>
                        <span className={styles.paletteHint}>{preset.hint}</span>
                      </span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className={styles.paletteFoot}>
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> insert · <kbd>esc</kbd> close</span>
            </div>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <AdminDialog
          variant="modal"
          title="Revision history"
          onClose={() => setHistoryOpen(false)}
          footer={<Button variant="outlined" onClick={() => setHistoryOpen(false)}>Close</Button>}
        >
          <p className={styles.historyNote}>
            A snapshot is saved every time you save. Restoring one puts its content back and snapshots the current state, so a restore can itself be undone.
          </p>
          {revisionsLoading ? <p className={styles.muted}>Loading…</p> : null}
          {!revisionsLoading && revisionsError ? <p role="alert" className={styles.saveError}>{revisionsError}</p> : null}
          {!revisionsLoading && !revisionsError && revisions.length === 0 ? (
            <p className={styles.muted}>No earlier versions yet — they appear after your next save.</p>
          ) : null}
          {!revisionsLoading && revisions.length > 0 ? (
            <ul className={styles.historyList}>
              {revisions.map((rev) => (
                <li key={rev.id} className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <strong>{rev.title || "Untitled"}</strong>
                    <span>{new Date(rev.created_at).toLocaleString()}</span>
                    <StatusChip status={rev.status} tone={statusTone(rev.status)} />
                  </div>
                  <Button size="sm" variant="outlined" disabled={restoringId !== null} onClick={() => void restoreRevision(rev.id)}>
                    {restoringId === rev.id ? "Restoring…" : "Restore"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </AdminDialog>
      ) : null}
    </div>
  );
}

const LEVEL_ICON: Record<CheckLevel, React.ReactNode> = {
  pass: <path d="m5 12 5 5L20 7" />,
  warn: <><path d="M12 8v5M12 17h.01" /><path d="M10.3 3.9 2.6 17a1.8 1.8 0 0 0 1.6 2.7h15.6A1.8 1.8 0 0 0 21.4 17L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" /></>,
  fail: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></>,
};

const GROUP_LABEL: Record<string, string> = { search: "Search", content: "Content", media: "Media" };

/** The Insights tab: a quality score plus every check, grouped. */
function InsightsPage({
  checks,
  score,
  words,
  readMinutes,
  onJump,
}: {
  checks: { id: string; group: string; label: string; level: CheckLevel; detail: string }[];
  score: { passed: number; total: number; pct: number };
  words: number;
  readMinutes: number;
  onJump: (index: number) => void;
}) {
  const groups = ["search", "content", "media"] as const;
  const tone = score.pct >= 80 ? "good" : score.pct >= 55 ? "ok" : "low";
  return (
    <section className={styles.insightsPage} aria-label="Post insights">
      <header className={styles.scoreCard} data-tone={tone}>
        <div className={styles.scoreRing} style={{ "--pct": `${score.pct}%` } as React.CSSProperties}>
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="30" className={styles.scoreTrack} />
            <circle cx="36" cy="36" r="30" className={styles.scoreValue} />
          </svg>
          <span className={styles.scoreNum}>{score.pct}</span>
        </div>
        <div className={styles.scoreText}>
          <h2 className={styles.pageTitle}>Readiness</h2>
          <p className={styles.pageLede}>
            {score.passed} of {score.total} checks passing · {words.toLocaleString()} words · {readMinutes} min read
          </p>
          <div className={styles.scoreOther}>
            <button type="button" className={styles.scoreJump} onClick={() => onJump(0)}>
              Jump to the start
            </button>
          </div>
        </div>
      </header>

      <section className={styles.checkGroup} aria-label="Keyboard shortcuts">
        <h3 className={styles.checkGroupTitle}>Shortcuts</h3>
        <ul className={styles.shortcutList}>
          {[
            ["⌘S", "Save draft"],
            ["⌘↵", "Publish"],
            ["⌘K", "Insert block"],
            ["⌘1–4", "Switch tab"],
            ["⌘D", "Duplicate block"],
            ["Alt↑↓", "Move block"],
          ].map(([keys, label]) => (
            <li key={keys}>
              <kbd>{keys}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.checkGroups}>
        {groups.map((group) => {
          const items = checks.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            <section key={group} className={styles.checkGroup}>
              <h3 className={styles.checkGroupTitle}>{GROUP_LABEL[group]}</h3>
              <ul className={styles.checkList}>
                {items.map((check) => (
                  <li key={check.id} className={styles.checkItem} data-level={check.level}>
                    <span className={styles.checkIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {LEVEL_ICON[check.level]}
                      </svg>
                    </span>
                    <div className={styles.checkText}>
                      <strong>{check.label}</strong>
                      <span>{check.detail}</span>
                    </div>
                    <span className={styles.srOnly}>{check.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

/** Right-rail outline for long posts: every heading, click to jump. */
function OutlineList({ items, onJump }: { items: { id: string; text: string; level: number; index: number }[]; onJump: (index: number) => void }) {
  if (!items.length) {
    return <p className={styles.railEmpty}>Add a heading and it shows up here.</p>;
  }
  return (
    <ol className={styles.outlineList}>
      {items.map((h, i) => (
        <li key={`${h.id}-${i}`} data-level={h.level}>
          <button type="button" className={styles.outlineItem} onClick={() => onJump(h.index)}>
            <span className={styles.outlineText}>{h.text}</span>
            <span className={styles.outlineLevel}>H{h.level}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function SettingsPanel({
  draft,
  patch,
  slugTouched,
  topics,
  authorName,
  coverOptions,
  onUploadCover,
}: {
  draft: EditorDraft;
  patch: (p: Partial<EditorDraft>) => void;
  slugTouched: React.MutableRefObject<boolean>;
  topics: { slug: string; name: string }[];
  authorName: string;
  coverOptions: { src: string; name?: string }[];
  onUploadCover: (file: File) => Promise<string>;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const src = await onUploadCover(file);
      patch({ cover: src, coverAlt: draft.coverAlt || "Cover image" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.sidePanel}>
      <section className={styles.sideSection}>
        <div className={styles.sideSectionHead}>
          <h3>Publishing</h3>
          <StatusChip status={draft.status} tone={statusTone(draft.status)} />
        </div>
        <div className={styles.formGrid}>
          <label className={styles.formField}>
            <span>Status</span>
            <select value={draft.status} onChange={(e) => patch({ status: e.target.value as EditorDraft["status"] })}>
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label className={styles.formField}>
            <span>Publish date</span>
            <input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </label>
          <label className={styles.formField}>
            <span>Author</span>
            <input value={authorName} readOnly />
          </label>
          <label className={styles.formField}>
            <span>Reading time</span>
            <input value={`${draft.readingMinutes} min`} readOnly />
          </label>
          <label className={styles.formField}>
            <span>URL</span>
            <div className={styles.slugRow}>
              <span>/blog/</span>
              <input
                value={draft.slug}
                aria-label="URL slug"
                onChange={(e) => {
                  slugTouched.current = true;
                  patch({ slug: slugifyTitle(e.target.value) });
                }}
              />
            </div>
          </label>
        </div>
      </section>

      <section className={styles.sideSection}>
        <div className={styles.sideSectionHead}>
          <h3>Cover image</h3>
          {draft.cover ? (
            <button type="button" className={styles.linkDanger} onClick={() => patch({ cover: null })}>Remove</button>
          ) : null}
        </div>
        {draft.cover ? (
          <div className={styles.sideCover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.cover} alt={draft.coverAlt} />
            <label className={styles.sideCoverChange}>
              {uploading ? "Uploading…" : "Change"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await upload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        ) : (
          <label className={styles.sideCoverEmpty}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
            </svg>
            {uploading ? "Uploading…" : "Upload a cover image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await upload(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <div className={styles.coverGrid}>
          {coverOptions.map(({ src }) => (
            <button
              key={src}
              type="button"
              className={draft.cover === src ? styles.coverActive : styles.coverItem}
              onClick={() => patch({ cover: src, coverAlt: draft.coverAlt || "Cover image" })}
              aria-label="Use this image as the cover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
          <label className={styles.coverUpload}>
            {uploading ? "…" : "+"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await upload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <label className={styles.formField}>
          <span>Alt text</span>
          <input
            placeholder="Describe the image for screen readers"
            value={draft.coverAlt}
            onChange={(e) => patch({ coverAlt: e.target.value })}
          />
        </label>
        {draft.cover ? (
          <>
            <div className={styles.heightRow}>
              <span>Height</span>
              <input
                type="range"
                min={200}
                max={900}
                step={20}
                aria-label="Cover height in pixels"
                value={draft.coverHeight ?? 560}
                onChange={(e) => patch({ coverHeight: Number(e.target.value) })}
              />
              <strong>{draft.coverHeight ?? 560}px</strong>
              {draft.coverHeight ? (
                <button type="button" className={styles.autoBtn} onClick={() => patch({ coverHeight: null })}>
                  Auto
                </button>
              ) : null}
            </div>
            <div className={styles.heightRow}>
              <span>Focus</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                aria-label="Cover focal point (which part of the image shows)"
                value={draft.coverFocal ?? 30}
                onChange={(e) => patch({ coverFocal: Number(e.target.value) })}
              />
              <strong>{draft.coverFocal ?? 30}%</strong>
            </div>
            <div className={styles.focusPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.cover}
                alt=""
                style={{ objectPosition: `center ${draft.coverFocal ?? 30}%` }}
              />
              <span className={styles.focusHint}>
                Drag Focus to choose which band of the image appears in the cover.
              </span>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.sideSection}>
        <div className={styles.sideSectionHead}>
          <h3>Organise</h3>
        </div>
        <label className={styles.formField}>
          <span>Topic</span>
          <select value={draft.category} onChange={(e) => patch({ category: e.target.value })}>
            <option value="">No topic</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.formField}>
          <span>Tags</span>
          <TagEditor tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </label>
      </section>

      <section className={styles.sideSection}>
        <div className={styles.sideSectionHead}>
          <h3>Prominence</h3>
        </div>
        <div className={styles.featureBox}>
          <label className={styles.toggleRow}>
            <input type="checkbox" checked={draft.featured} onChange={(e) => patch({ featured: e.target.checked })} />
            <span>
              <strong>Feature on the homepage</strong>
              <em>The lead story in the hero card. Only one post is featured at a time — featuring this one quietly un-features the rest.</em>
            </span>
          </label>
        </div>
      </section>

      <p className={styles.settingsNote}>
        Structured data, RSS and social cards are generated from these fields when you publish.
      </p>
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState("");

  function commit(raw: string) {
    // Accepts "a, b, c" — splits on commas, trims, dedupes, caps length.
    const next = [...tags];
    for (const part of raw.split(",")) {
      const t = part.trim().slice(0, 40);
      if (t && !next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== tags.length) onChange(next);
    setValue("");
  }

  return (
    <div className={styles.tagWrap}>
      {tags.map((t) => (
        <span key={t} className={styles.tag}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input
        className={styles.tagInput}
        value={value}
        placeholder={tags.length ? "Add tag, or paste a,b,c…" : "Add tags — separate with commas…"}
        onChange={(e) => {
          if (e.target.value.includes(",")) commit(e.target.value);
          else setValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && value.trim()) {
            e.preventDefault();
            commit(value);
          } else if (e.key === "Backspace" && !value && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => value.trim() && commit(value)}
      />
    </div>
  );
}

/* Selectable UI styles per block type. The first entry is the default look;
   picking one writes block.variant, which the renderer maps to a CSS class. */
const BLOCK_VARIANTS: Record<string, { value: string; label: string }[]> = {
  quote: [{ value: "bar", label: "Bar" }, { value: "card", label: "Card" }, { value: "big", label: "Big statement" }, { value: "plain", label: "Plain italic" }],
  callout: [{ value: "chip", label: "Icon chip" }, { value: "left", label: "Left rule" }, { value: "outline", label: "Outline" }, { value: "filled", label: "Filled" }],
  table: [{ value: "default", label: "Default" }, { value: "striped", label: "Striped rows" }, { value: "cards", label: "Cards" }],
  cta: [{ value: "button", label: "Button" }, { value: "banner", label: "Banner" }, { value: "link", label: "Text link" }],
  related: [{ value: "tout", label: "Split tout" }, { value: "banner", label: "Wide banner" }, { value: "minimal", label: "Minimal" }],
  keypoints: [{ value: "card", label: "Summary card" }, { value: "plain", label: "Plain" }, { value: "checklist", label: "Checklist" }],
  stats: [{ value: "cards", label: "Banded row" }, { value: "plain", label: "Plain" }, { value: "grid", label: "Grid tiles" }],
  timestrip: [{ value: "spine", label: "Timeline spine" }, { value: "cards", label: "Cards" }, { value: "rows", label: "Rows" }],
  accordion: [{ value: "cards", label: "Cards" }, { value: "divided", label: "Divided list" }, { value: "numbered", label: "Numbered" }],
  proscons: [{ value: "columns", label: "Two columns" }, { value: "split", label: "Split panel" }, { value: "stacked", label: "Stacked" }],
  steps: [{ value: "numbered", label: "Numbered" }, { value: "connected", label: "Connected" }, { value: "cards", label: "Cards" }],
  glossary: [{ value: "rows", label: "Grouped rows" }, { value: "grid", label: "Grid" }, { value: "chips", label: "Chips" }],
  diff: [{ value: "sidebyside", label: "Side by side" }, { value: "unified", label: "Stacked" }],
  person: [{ value: "profile", label: "Google profile" }, { value: "card", label: "Horizontal card" }, { value: "inline", label: "Inline" }, { value: "quote", label: "Quote accent" }],
  progress: [{ value: "bar", label: "Bar" }, { value: "ring", label: "Ring" }, { value: "segmented", label: "Segmented" }],
  linkcards: [{ value: "grid", label: "Grid" }, { value: "list", label: "List" }, { value: "tiles", label: "Tiles" }],
  compare: [{ value: "table", label: "Table" }, { value: "columns", label: "Columns" }],
  countdown: [{ value: "grid", label: "Countdown grid" }, { value: "inline", label: "Inline" }],
};

/** Named colour presets — each sets accent + background + text together so a
    block can be re-skinned in one click. "Custom" reveals free pickers. */
const COLOR_TEMPLATES = [
  { id: "default", label: "Default", accent: "", bg: "", text: "" },
  { id: "blue", label: "Blue", accent: "#1a73e8", bg: "#e8f0fe", text: "#174ea6" },
  { id: "green", label: "Green", accent: "#188038", bg: "#e6f4ea", text: "#0d652d" },
  { id: "purple", label: "Purple", accent: "#8430ce", bg: "#f3e8fd", text: "#5b1fa0" },
  { id: "amber", label: "Amber", accent: "#b06000", bg: "#fef7e0", text: "#7a4100" },
  { id: "red", label: "Red", accent: "#d93025", bg: "#fce8e6", text: "#a50e0e" },
  { id: "slate", label: "Slate", accent: "#3c4043", bg: "#f1f3f4", text: "#202124" },
] as const;

function templateFor(a?: string, b?: string, c?: string): string {
  const hit = COLOR_TEMPLATES.find((t) => (t.accent || undefined) === (a || undefined) && (t.bg || undefined) === (b || undefined) && (t.text || undefined) === (c || undefined));
  return hit?.id ?? "custom";
}

/** A compact "Style:" segmented control shown at the top of a block's editor. */
function VariantPicker({ type, value, onChange }: { type: string; value?: string; onChange: (v: string | undefined) => void }) {
  const options = BLOCK_VARIANTS[type];
  if (!options || options.length < 2) return null;
  return (
    <div className={styles.variantRow} role="group" aria-label="Block style">
      <span className={styles.variantLabel}>Style</span>
      <div className={styles.variantSeg}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? styles.variantOn : styles.variantBtn}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange, imageOptions, postOptions = [], onOpenPaletteInsert, onImportUrl }: { block: Block; onChange: (b: Block) => void; imageOptions: { src: string; label: string }[]; postOptions?: { slug: string; title: string; summary: string; cover: string }[]; onOpenPaletteInsert?: () => void; onImportUrl?: (fromBlock: { type: "p"; html: string }, kind: "image" | "embed") => void }) {
  const toast = useToast();
  const headingRef = useRef<HTMLTextAreaElement>(null);
  const headingText = block.type === "h2" || block.type === "h3" ? block.text : null;

  /* Focus a row in the list block (scoped to its own block container). */
  function focusListItem(i: number) {
    // Resolve the block now — the trigger input may unmount on re-render.
    const scope = (document.activeElement as HTMLElement | null)?.closest("[data-block-index]") ?? document;
    window.setTimeout(() => {
      const el = scope.querySelector<HTMLInputElement>(`input[data-list-item="${i}"]`);
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, 30);
  }

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [headingText, block.type]);

  /* Prepend the style picker to any block that offers variants. */
  const withVariant = (node: React.ReactNode) => {
    const styled = block as { variant?: string; accent?: string; bg?: string; text?: string };
    const hasVariants = Boolean(BLOCK_VARIANTS[block.type]);
    // Colour controls are useful on any visual block, but not on a bare
    // paragraph or heading (they inherit the article's own styling).
    const noColors = block.type === "p" || block.type === "h2" || block.type === "h3";
    if (!hasVariants && noColors) return node;
    const activeTemplate = templateFor(styled.accent, styled.bg, styled.text);
    const customOpen = activeTemplate === "custom";
    const colorField = (key: "accent" | "bg" | "text", label: string, fallback: string) => (
      <div className={styles.accentGroup}>
        <span className={styles.variantLabel}>{label}</span>
        <input
          type="color"
          aria-label={`Block ${label.toLowerCase()} colour`}
          value={styled[key] ?? fallback}
          onChange={(e) => onChange({ ...block, [key]: e.target.value } as unknown as Block)}
        />
        {styled[key] ? (
          <button
            type="button"
            className={styles.accentClear}
            onClick={() => onChange({ ...block, [key]: undefined } as unknown as Block)}
          >
            Reset
          </button>
        ) : null}
      </div>
    );
    return (
      <>
        {hasVariants ? (
          <VariantPicker
            type={block.type}
            value={styled.variant}
            onChange={(v) => onChange({ ...block, variant: v } as unknown as Block)}
          />
        ) : null}
        {!noColors ? (
          <div className={styles.colorBar}>
            <div className={styles.swatchRow} role="group" aria-label="Colour template">
              {COLOR_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={activeTemplate === t.id ? styles.swatchOn : styles.swatch}
                  title={t.label}
                  aria-pressed={activeTemplate === t.id}
                  onClick={() =>
                    onChange(
                      { ...block, accent: t.accent || undefined, bg: t.bg || undefined, text: t.text || undefined } as unknown as Block,
                    )
                  }
                >
                  {t.id === "default" ? (
                    <span className={styles.swatchDefault} aria-hidden="true">Aa</span>
                  ) : (
                    <span className={styles.swatchChip} style={{ background: t.bg, color: t.text, boxShadow: `inset 0 -3px 0 ${t.accent}` }} aria-hidden="true">
                      Aa
                    </span>
                  )}
                  <em>{t.label}</em>
                </button>
              ))}
              <button
                type="button"
                className={customOpen ? styles.swatchOn : styles.swatch}
                title="Pick custom colours"
                aria-pressed={customOpen}
                onClick={() => onChange({ ...block, accent: styled.accent ?? "#1a73e8", bg: styled.bg ?? "#f8f9fa", text: styled.text ?? "#202124" } as unknown as Block)}
              >
                <span className={styles.swatchCustom} aria-hidden="true">＋</span>
                <em>Custom</em>
              </button>
            </div>
            {customOpen ? (
              <div className={styles.accentRow}>
                {colorField("accent", "Accent", "#1a73e8")}
                {colorField("bg", "Background", "#f8f9fa")}
                {colorField("text", "Text", "#202124")}
              </div>
            ) : null}
          </div>
        ) : null}
        {node}
      </>
    );
  };

  return withVariant((() => {
    switch (block.type) {
      case "h2":
      case "h3":
        return (
          <textarea
            ref={headingRef}
            rows={1}
            className={block.type === "h2" ? styles.blockH2 : styles.blockH3}
            value={block.text}
            placeholder={block.type === "h2" ? "Section heading" : "Subheading"}
            onChange={(e) => onChange({ ...block, text: e.target.value, id: slugifyTitle(e.target.value) })}
          />
        );
      case "quote":
        return (
          <div className={styles.quoteWrap}>
            <RichEditor value={block.html} onChange={(html) => onChange({ ...block, html })} placeholder="Quote text" minHeight={44} />
            <input
              className={styles.quoteCite}
              value={block.cite ?? ""}
              placeholder="Attribution (optional)"
              onChange={(e) => onChange({ ...block, cite: e.target.value })}
            />
            <div className={styles.rowQuoteMeta}>
              <select
                aria-label="Quote style"
                value={block.variant ?? "bar"}
                onChange={(e) => onChange({ ...block, variant: e.target.value as "bar" | "card" })}
              >
                <option value="bar">Style: left bar</option>
                <option value="card">Style: author card</option>
              </select>
              <select
                aria-label="Quote size"
                value={block.size ?? "md"}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ ...block, size: v === "md" ? undefined : (v as "sm" | "lg") });
                }}
              >
                <option value="sm">Size: small</option>
                <option value="md">Size: medium</option>
                <option value="lg">Size: large</option>
              </select>
            </div>
            <label className={styles.quoteColor}>
              Background
              <input
                type="color"
                value={block.bg ?? (block.variant === "card" ? "#eef2ff" : "#ffffff")}
                onChange={(e) => onChange({ ...block, bg: e.target.value })}
              />
              {block.bg ? (
                <button type="button" onClick={() => onChange({ ...block, bg: undefined })}>Reset</button>
              ) : null}
            </label>
          </div>
        );
      case "callout":
        return (
          <div className={styles.calloutWrap}>
            <select
              value={block.tone}
              onChange={(e) => onChange({ ...block, tone: e.target.value as "note" | "tip" | "warning" | "info" })}
            >
              <option value="note">Note</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <input
              value={block.icon ?? ""}
              maxLength={4}
              placeholder="Emoji icon (optional)"
              onChange={(e) => onChange({ ...block, icon: e.target.value })}
            />
            <input
              value={block.title ?? ""}
              placeholder="Title (optional)"
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
            <RichEditor value={block.html} onChange={(html) => onChange({ ...block, html })} placeholder="Callout text" minHeight={44} />
          </div>
        );
      case "list":
        return (
          <div className={styles.listWrap}>
            <label className={styles.listType}>
              <input
                type="checkbox"
                checked={Boolean(block.ordered)}
                onChange={(e) => onChange({ ...block, ordered: e.target.checked })}
              />
              Numbered
            </label>
            {block.items.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <input
                  value={item}
                  placeholder={`Item ${i + 1}`}
                  data-list-item={i}
                  onChange={(e) => onChange({ ...block, items: block.items.map((x, idx) => (idx === i ? e.target.value : x)) })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    // Enter starts the next bullet; Enter on an empty item ends the list.
                    if (!item.trim() && block.items.length > 1) {
                      const rest = block.items.filter((_, idx) => idx !== i);
                      onChange({ ...block, items: rest });
                      focusListItem(i - 1);
                    } else if (item.trim()) {
                      onChange({ ...block, items: [...block.items.slice(0, i + 1), "", ...block.items.slice(i + 1)] });
                      focusListItem(i + 1);
                    }
                  }}
                />
                <button type="button" onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className={styles.linkBtn} onClick={() => onChange({ ...block, items: [...block.items, ""] })}>
              + Add item
            </button>
          </div>
        );
      case "code":
        return (
          <div className={styles.codeWrap}>
            <div className={styles.codeBar}>
              <input
                value={block.filename ?? ""}
                placeholder="filename (optional)"
                onChange={(e) => onChange({ ...block, filename: e.target.value })}
              />
              <input
                className={styles.langInput}
                value={block.lang}
                placeholder="language"
                spellCheck={false}
                onChange={(e) => onChange({ ...block, lang: e.target.value })}
              />
            </div>
            <textarea
              className={styles.code}
              value={block.code}
              placeholder="Paste code"
              rows={6}
              spellCheck={false}
              onChange={(e) => onChange({ ...block, code: e.target.value })}
            />
          </div>
        );
      case "image":
        return <MediaBlockEditor block={block} onChange={onChange} imageOptions={imageOptions} />;
      case "imgtext":
        return (
          <div className={styles.listWrap}>
            <MediaBlockEditor
              block={{ type: "image", src: block.src, alt: block.alt, caption: "" }}              onChange={(next) =>
                  onChange({ ...block, src: "src" in next ? next.src ?? "" : "", alt: "alt" in next ? next.alt ?? "" : "" })
                }
              imageOptions={imageOptions}
            />
            <select
              aria-label="Photo placement"
              value={block.side ?? "left"}
              onChange={(e) => onChange({ ...block, side: e.target.value as "left" | "right" })}
            >
              <option value="left">Photo on the left</option>
              <option value="right">Photo on the right</option>
            </select>
            <RichEditor value={block.html} onChange={(html) => onChange({ ...block, html })} placeholder="Text beside the photo" minHeight={88} />
          </div>
        );
      case "row": {
        return <RowBlockEditor block={block} onChange={onChange} imageOptions={imageOptions} />;
      }
      case "video":
        return (
          <div className={styles.imageWrap}>
            <input
              value={block.url}
              placeholder="YouTube or Vimeo link… or upload a video below"
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
            {!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i.test(block.url) ? (
              <label className={styles.uploadBtn}>
                Upload video (MP4/WebM)
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { src } = await api.upload(file);
                      onChange({ ...block, url: src });
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Upload failed");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
            {block.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`https://img.youtube.com/vi/${(block.url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/)?.[1] ?? "")}/hqdefault.jpg`} alt="" hidden={!/youtu/i.test(block.url)} style={{ width: 220, borderRadius: 10 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : null}
            <input value={block.poster ?? ""} placeholder="Poster image URL (optional)" onChange={(e) => onChange({ ...block, poster: e.target.value })} />
            {!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i.test(block.url) ? (
              <label className={styles.mediaCheck}>
                <input type="checkbox" checked={Boolean(block.autoplay)} onChange={(e) => onChange({ ...block, autoplay: e.target.checked })} />
                <span>
                  <strong>Autoplay muted + loop</strong>
                  <em>Use for ambient inline clips. Direct video files only.</em>
                </span>
              </label>
            ) : null}
            <input value={block.caption ?? ""} placeholder="Caption (optional)" onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          </div>
        );
      case "table":
        return (
          <div className={styles.tableWrap}>
            <div className={styles.tableRow}>
              {block.head.map((h, i) => (
                <input
                  key={i}
                  value={h}
                  onChange={(e) => onChange({ ...block, head: block.head.map((x, idx) => (idx === i ? e.target.value : x)) })}
                />
              ))}
            </div>
            {block.rows.map((row, r) => (
              <div key={r} className={styles.tableRow}>
                {row.map((cell, c) => (
                  <input
                    key={c}
                    value={cell}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        rows: block.rows.map((rr, ri) => (ri === r ? rr.map((cc, ci) => (ci === c ? e.target.value : cc)) : rr)),
                      })
                    }
                  />
                ))}
              </div>
            ))}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => onChange({ ...block, rows: [...block.rows, block.head.map(() => "")] })}
            >
              + Add row
            </button>
          </div>
        );
      case "related":
        return (
          <div className={styles.imageWrap}>
            <span style={{ fontSize: 12, color: "#5f6368" }}>Inserts a “Related Article” card linking to one of your posts.</span>
            <select
              value={block.slug}
              onChange={(e) => {
                const pick = postOptions.find((o) => o.slug === e.target.value);
                onChange(pick ? { ...block, slug: pick.slug, title: pick.title, description: pick.summary, image: pick.cover } : { ...block, slug: e.target.value });
              }}
            >
              <option value="">Pick a post to feature…</option>
              {postOptions.map((o) => (
                <option key={o.slug} value={o.slug}>{o.title}</option>
              ))}
            </select>
            <input value={block.title} placeholder="Title (shown on the card)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <input value={block.description ?? ""} placeholder="One-line description" onChange={(e) => onChange({ ...block, description: e.target.value })} />
            <div className={styles.rowQuoteMeta}>
              <input value={block.eyebrow ?? ""} placeholder="Eyebrow (Related Article)" onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} />
              <input value={block.cta ?? ""} placeholder="Link label (See more)" onChange={(e) => onChange({ ...block, cta: e.target.value })} />
            </div>
            <select value={block.image ?? ""} onChange={(e) => onChange({ ...block, image: e.target.value })}>
              <option value="">Card image (optional)…</option>
              {imageOptions.map((g) => (
                <option key={g.src} value={g.src}>{g.label}</option>
              ))}
            </select>
            <div>
              <span style={{ fontSize: 12, color: "#5f6368", display: "block", marginBottom: 6 }}>Card colour</span>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                {TOUT_SWATCHES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    aria-label={t.label}
                    onClick={() => onChange({ ...block, color: block.color === t.id ? undefined : t.id })}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      cursor: "pointer",
                      background: t.css,
                      border: block.color === t.id ? "2px solid #202124" : "1px solid #dadce0",
                      boxShadow: block.color === t.id ? "0 0 0 2px #fff, 0 0 0 3px #202124" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case "chart":
        return <ChartEditor chart={block.chart} onChange={(chart) => onChange({ type: "chart", chart })} />;
      case "divider":
        return <hr className={styles.divider} />;
      case "cta":
        return (
          <div className={styles.calloutWrap}>
            <input value={block.label} placeholder="Button label — e.g. Read the series" onChange={(e) => onChange({ ...block, label: e.target.value })} />
            <input value={block.href} placeholder="Link URL (/newsletter, https://…)" onChange={(e) => onChange({ ...block, href: e.target.value })} />
            <select aria-label="Button style" value={block.style ?? "primary"} onChange={(e) => onChange({ ...block, style: e.target.value as "primary" | "outline" })}>
              <option value="primary">Filled button</option>
              <option value="outline">Outline button</option>
            </select>
            <input value={block.note ?? ""} placeholder="Small note beside the button (optional)" onChange={(e) => onChange({ ...block, note: e.target.value })} />
          </div>
        );
      case "footnote":
        return (
          <div className={styles.listWrap}>
            <input value={block.text} placeholder="Footnote text — numbered automatically on the site" onChange={(e) => onChange({ ...block, text: e.target.value })} />
          </div>
        );
      case "stats":
        return (
          <div className={styles.listWrap}>
            <p className={styles.blockNote}>Big figures with a short caption each — three or four read best.</p>
            {block.items.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <input value={item.value} placeholder="Value — e.g. 1.2M" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, value: e.target.value } : v)) })} />
                <input value={item.label} placeholder="Label — e.g. monthly readers" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, label: e.target.value } : v)) })} />
                <input value={item.note ?? ""} placeholder="Note (optional)" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, note: e.target.value } : v)) })} />
                <button type="button" aria-label={`Remove stat ${i + 1}`} onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, { value: "", label: "" }] })}>+ Add stat</Button>
          </div>
        );
      case "timestrip":
        return (
          <div className={styles.listWrap}>
            <input value={block.title ?? ""} placeholder="Strip heading (optional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            {block.items.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <input value={item.date} placeholder="Date — e.g. 2019" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, date: e.target.value } : v)) })} />
                <input value={item.title} placeholder="Milestone" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)) })} />
                <input value={item.detail ?? ""} placeholder="Detail (optional)" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, detail: e.target.value } : v)) })} />
                <button type="button" aria-label={`Remove milestone ${i + 1}`} onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, { date: "", title: "" }] })}>+ Add milestone</Button>
          </div>
        );
      case "bafter":
        return <BeforeAfterEditor block={block} onChange={onChange} imageOptions={imageOptions} />;
      case "accordion":
        return (
          <div className={styles.listWrap}>
            <input value={block.title ?? ""} placeholder="Heading above the questions (optional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            {block.items.map((item, i) => (
              <div key={i} className={styles.listWrap} style={{ paddingLeft: 10, borderLeft: "2px solid var(--line)" }}>
                <div className={styles.listItem}>
                  <input
                    value={item.q}
                    placeholder={`Question ${i + 1}`}
                    onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, q: e.target.value } : v)) })}
                  />
                  <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
                </div>
                <RichEditor
                  value={item.html}
                  onChange={(html) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, html } : v)) })}
                  placeholder="Answer"
                  minHeight={40}
                />
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, { q: "", html: "" }] })}>+ Add question</Button>
          </div>
        );
      case "steps":
        return (
          <div className={styles.listWrap}>
            <input value={block.title ?? ""} placeholder="Steps heading (optional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            {block.items.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.stepBadge}>{i + 1}</span>
                <input value={item.title} placeholder={`Step ${i + 1}`} onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)) })} />
                <input value={item.detail ?? ""} placeholder="Detail (optional)" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, detail: e.target.value } : v)) })} />
                <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, { title: "", detail: "" }] })}>+ Add step</Button>
          </div>
        );
      case "proscons":
        return (
          <div className={styles.listWrap}>
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>Left label</span>
                <input value={block.prosLabel ?? ""} placeholder="Worth it" onChange={(e) => onChange({ ...block, prosLabel: e.target.value })} />
              </label>
              <label className={styles.formField}>
                <span>Right label</span>
                <input value={block.consLabel ?? ""} placeholder="Trade-offs" onChange={(e) => onChange({ ...block, consLabel: e.target.value })} />
              </label>
            </div>
            {(["pros", "cons"] as const).map((side) => (
              <div key={side} className={styles.listWrap}>
                <p className={styles.blockNote}>{side === "pros" ? "Points in favour" : "Points against"}</p>
                {block[side].map((item, i) => (
                  <div key={i} className={styles.listItem}>
                    <input
                      value={item}
                      placeholder={`${side === "pros" ? "Pro" : "Con"} ${i + 1}`}
                      onChange={(e) => onChange({ ...block, [side]: block[side].map((v, idx) => (idx === i ? e.target.value : v)) })}
                    />
                    <button type="button" aria-label={`Remove ${side} ${i + 1}`} onClick={() => onChange({ ...block, [side]: block[side].filter((_, idx) => idx !== i) })}>×</button>
                  </div>
                ))}
                <Button variant="text" size="sm" onClick={() => onChange({ ...block, [side]: [...block[side], ""] })}>
                  + Add {side === "pros" ? "pro" : "con"}
                </Button>
              </div>
            ))}
          </div>
        );
      case "glossary":
        return (
          <div className={styles.listWrap}>
            <input value={block.title ?? ""} placeholder="Glossary heading (optional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            {block.terms.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <input value={item.term} placeholder="Term" onChange={(e) => onChange({ ...block, terms: block.terms.map((v, idx) => (idx === i ? { ...v, term: e.target.value } : v)) })} />
                <input value={item.def} placeholder="Definition" onChange={(e) => onChange({ ...block, terms: block.terms.map((v, idx) => (idx === i ? { ...v, def: e.target.value } : v)) })} />
                <button type="button" aria-label={`Remove term ${i + 1}`} onClick={() => onChange({ ...block, terms: block.terms.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, terms: [...block.terms, { term: "", def: "" }] })}>+ Add term</Button>
          </div>
        );
      case "diff":
        return (
          <div className={styles.listWrap}>
            <input value={block.filename ?? ""} placeholder="File name (optional)" onChange={(e) => onChange({ ...block, filename: e.target.value })} />
            <label className={styles.formField}>
              <span>Before</span>
              <textarea
                rows={6}
                value={block.before}
                placeholder="Old version"
                spellCheck={false}
                onChange={(e) => onChange({ ...block, before: e.target.value })}
              />
            </label>
            <label className={styles.formField}>
              <span>After</span>
              <textarea
                rows={6}
                value={block.after}
                placeholder="New version"
                spellCheck={false}
                onChange={(e) => onChange({ ...block, after: e.target.value })}
              />
            </label>
          </div>
        );
      case "person":
        return (
          <PersonEditor block={block} onChange={onChange} />
        );
      case "progress":
        return (
          <div className={styles.calloutWrap}>
            <input value={block.label ?? ""} placeholder="Label — e.g. Coverage" onChange={(e) => onChange({ ...block, label: e.target.value })} />
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>Value</span><input type="number" value={block.value} onChange={(e) => onChange({ ...block, value: Number(e.target.value) })} /></label>
              <label className={styles.formField}><span>Max</span><input type="number" value={block.max ?? 100} onChange={(e) => onChange({ ...block, max: Number(e.target.value) || 100 })} /></label>
              <label className={styles.formField}><span>Unit</span><input value={block.unit ?? ""} placeholder="%" onChange={(e) => onChange({ ...block, unit: e.target.value })} /></label>
            </div>
            <input value={block.note ?? ""} placeholder="Note below the bar (optional)" onChange={(e) => onChange({ ...block, note: e.target.value })} />
          </div>
        );
      case "linkcards":
        return (
          <div className={styles.listWrap}>
            <input value={block.title ?? ""} placeholder="Section heading (optional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
            {block.items.map((c, i) => (
              <div key={i} className={styles.listWrap} style={{ paddingLeft: 10, borderLeft: "2px solid var(--line)" }}>
                <div className={styles.listItem}>
                  <input value={c.title} placeholder={`Card ${i + 1} title`} onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)) })} />
                  <button type="button" aria-label={`Remove card ${i + 1}`} onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}>×</button>
                </div>
                <input value={c.href} placeholder="https://… or /path" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, href: e.target.value } : v)) })} />
                <input value={c.desc ?? ""} placeholder="Description (optional)" onChange={(e) => onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? { ...v, desc: e.target.value } : v)) })} />
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, { title: "", href: "", desc: "" }] })}>+ Add link card</Button>
          </div>
        );
      case "compare":
        return (
          <div className={styles.listWrap}>
            <div className={styles.formGrid}>
              <label className={styles.formField}><span>Column A</span><input value={block.columns[0]} onChange={(e) => onChange({ ...block, columns: [e.target.value, block.columns[1]] })} /></label>
              <label className={styles.formField}><span>Column B</span><input value={block.columns[1]} onChange={(e) => onChange({ ...block, columns: [block.columns[0], e.target.value] })} /></label>
            </div>
            {block.rows.map((r, i) => (
              <div key={i} className={styles.listItem}>
                <input value={r.feature} placeholder="Feature" onChange={(e) => onChange({ ...block, rows: block.rows.map((v, idx) => (idx === i ? { ...v, feature: e.target.value } : v)) })} />
                <input value={r.a} placeholder="A — ✓ / ✗ / text" onChange={(e) => onChange({ ...block, rows: block.rows.map((v, idx) => (idx === i ? { ...v, a: e.target.value } : v)) })} />
                <input value={r.b} placeholder="B — ✓ / ✗ / text" onChange={(e) => onChange({ ...block, rows: block.rows.map((v, idx) => (idx === i ? { ...v, b: e.target.value } : v)) })} />
                <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => onChange({ ...block, rows: block.rows.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, rows: [...block.rows, { feature: "", a: "", b: "" }] })}>+ Add row</Button>
          </div>
        );
      case "countdown":
        return (
          <div className={styles.calloutWrap}>
            <input value={block.label ?? ""} placeholder="Heading — e.g. Launching in" onChange={(e) => onChange({ ...block, label: e.target.value })} />
            <label className={styles.formField}>
              <span>Date &amp; time</span>
              <input type="datetime-local" value={block.date?.slice(0, 16)} onChange={(e) => onChange({ ...block, date: e.target.value })} />
            </label>
            <input value={block.note ?? ""} placeholder="Note (optional)" onChange={(e) => onChange({ ...block, note: e.target.value })} />
          </div>
        );
      case "embed": {
        const known = [
          ["YouTube", "youtube.com"], ["X / Twitter", "x.com"], ["Instagram", "instagram.com"],
          ["Threads", "threads.net"], ["TikTok", "tiktok.com"], ["Facebook", "facebook.com"],
          ["LinkedIn", "linkedin.com"], ["Medium", "medium.com"], ["GitHub", "github.com"],
          ["CodePen", "codepen.io"], ["Spotify", "open.spotify.com"], ["SoundCloud", "soundcloud.com"],
          ["Vimeo", "vimeo.com"], ["Google Maps", "maps.google.com"], ["Notion", "notion.so"],
          ["Figma", "figma.com"], ["Canva", "canva.com"], ["Discord", "discord.com"],
        ] as const;
        return (
          <div className={styles.listWrap}>
            <input
              value={block.url}
              placeholder="Paste any link — YouTube, X, Instagram, TikTok, GitHub, Notion…"
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
            <input
              value={block.caption ?? ""}
              placeholder="Caption (optional)"
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
            />
            <details className={styles.embedHelp}>
              <summary>Supported platforms</summary>
              <p className={styles.blockNote}>
                These render as native embeds. Any other URL still saves and shows as a styled link card.
              </p>
              <div className={styles.embedChips}>
                {known.map(([label, host]) => (
                  <span key={host} className={styles.embedChip}>{label}</span>
                ))}
              </div>
            </details>
          </div>
        );
      }
      case "keypoints":
        return (
          <div className={styles.listWrap}>
            <input
              value={block.title ?? ""}
              placeholder="Heading (e.g. Key takeaways)"
              onChange={(e) => onChange({ ...block, title: e.target.value })}
            />
            {block.items.map((item, i) => (
              <div key={i} className={styles.listItem}>
                <input
                  value={item}
                  placeholder={`Takeaway ${i + 1}`}
                  onChange={(e) =>
                    onChange({ ...block, items: block.items.map((v, idx) => (idx === i ? e.target.value : v)) })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onChange({ ...block, items: [...block.items.slice(0, i + 1), "", ...block.items.slice(i + 1)] });
                    }
                  }}
                />
                {block.items.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove takeaway ${i + 1}`}
                    onClick={() => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) })}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            <Button variant="text" size="sm" onClick={() => onChange({ ...block, items: [...block.items, ""] })}>
              + Add takeaway
            </Button>
          </div>
        );
      default: {
        const html = typeof (block as { html?: unknown }).html === "string" ? (block as { html: string }).html : "";
        return (
          <div
            onPaste={(e) => {
              // Smart paste: a bare image/video/embed URL becomes its own block.
              const pBlock = block as { type: "p"; html: string };
              const text = e.clipboardData.getData("text/plain").trim();
              if (onImportUrl && text && /^https?:\/\/\S+$/.test(text) && richIsEmpty(pBlock.html)) {
                const kind = urlBlockKind(text);
                if (kind) {
                  e.preventDefault();
                  onImportUrl(pBlock, kind);
                  return;
                }
              }
              // Slash menu: “/” in an empty paragraph opens the insert palette.
              if (onOpenPaletteInsert && richIsEmpty(pBlock.html)) {
                const el = e.currentTarget as HTMLElement;
                window.setTimeout(() => {
                  if (el.textContent?.trim() === "/") onOpenPaletteInsert();
                }, 0);
              }
            }}
          >
            <RichEditor
              value={html}
              onChange={(next) => onChange({ ...(block as { type: "p"; html: string }), html: next })}
            />
          </div>
        );
      }
    }
  })());
}

/* Before/after comparison: two photos + labels; the site renders a draggable
   slider between them. */
/* Social presets: filling the label and icon from the host keeps a person's
   links consistent without the author hand-picking icons every time. */
const SOCIAL_PRESETS = [
  { id: "github", label: "GitHub", host: "github.com" },
  { id: "linkedin", label: "LinkedIn", host: "linkedin.com" },
  { id: "x", label: "X", host: "x.com" },
  { id: "twitter", label: "Twitter", host: "twitter.com" },
  { id: "threads", label: "Threads", host: "threads.com" },
  { id: "instagram", label: "Instagram", host: "instagram.com" },
  { id: "youtube", label: "YouTube", host: "youtube.com" },
  { id: "facebook", label: "Facebook", host: "facebook.com" },
  { id: "email", label: "Email", host: "mailto:" },
];

const LINK_ICONS = ["github", "linkedin", "x", "threads", "instagram", "youtube", "facebook", "email", "website"];

/** Detect the social network from a URL so pasting a link fills the icon. */
function iconForHref(href: string): string {
  const h = href.toLowerCase();
  const hit = SOCIAL_PRESETS.find((p) => h.includes(p.host));
  return hit ? hit.id : /^https?:/.test(h) ? "website" : "email";
}

function PersonEditor({ block, onChange }: { block: Extract<Block, { type: "person" }>; onChange: (b: Block) => void }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const links = block.links ?? [];

  function setLinks(next: { label: string; href: string; icon?: string }[]) {
    onChange({ ...block, links: next });
  }

  function addPreset(preset: (typeof SOCIAL_PRESETS)[number]) {
    if (links.some((l) => l.icon === preset.id)) {
      toast(`${preset.label} is already added`);
      return;
    }
    setLinks([...links, { label: preset.label, href: preset.host === "mailto:" ? "mailto:" : "", icon: preset.id }]);
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const { src } = await api.upload(file);
      onChange({ ...block, avatar: src });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.personEditor}>
      <div className={styles.personTop}>
        <label className={styles.personAvatarPick} aria-label="Upload avatar">
          {block.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.avatar} alt="" />
          ) : (
            <span>{block.name.trim().slice(0, 1).toUpperCase() || "?"}</span>
          )}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
              e.target.value = "";
            }}
          />
          <em>{uploading ? "…" : "Photo"}</em>
        </label>
        <div className={styles.personFields}>
          <input value={block.name} placeholder="Name" onChange={(e) => onChange({ ...block, name: e.target.value })} />
          <input value={block.role ?? ""} placeholder="Role — e.g. Security researcher" onChange={(e) => onChange({ ...block, role: e.target.value })} />
        </div>
      </div>

      <input value={block.avatar ?? ""} placeholder="Avatar URL (or upload above)" onChange={(e) => onChange({ ...block, avatar: e.target.value })} />

      <RichEditor value={block.html ?? ""} onChange={(html) => onChange({ ...block, html })} placeholder="Short bio or quote (optional)" minHeight={48} />

      <div className={styles.personLinksHead}>
        <span>Links</span>
        <div className={styles.socialRow}>
          {SOCIAL_PRESETS.map((p) => (
            <button key={p.id} type="button" className={styles.socialChip} onClick={() => addPreset(p)} title={`Add ${p.label}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {links.length === 0 ? <p className={styles.blockNote}>No links yet — pick a network above or add a custom one.</p> : null}

      {links.map((l, i) => (
        <div key={i} className={styles.personLinkRow}>
          <select
            aria-label={`Icon for link ${i + 1}`}
            value={l.icon ?? iconForHref(l.href)}
            onChange={(e) => setLinks(links.map((v, idx) => (idx === i ? { ...v, icon: e.target.value } : v)))}
          >
            {LINK_ICONS.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <input
            value={l.label}
            placeholder="Label"
            onChange={(e) => setLinks(links.map((v, idx) => (idx === i ? { ...v, label: e.target.value } : v)))}
          />
          <input
            value={l.href}
            placeholder="https://… or mailto:"
            onChange={(e) => {
              const href = e.target.value;
              setLinks(links.map((v, idx) => {
                if (idx !== i) return v;
                // Auto-fill the icon while the author types a known host.
                const auto = /^https?:|^mailto:/i.test(href) ? iconForHref(href) : v.icon;
                return { ...v, href, ...(auto ? { icon: auto } : {}) };
              }));
            }}
          />
          <div className={styles.personLinkTools}>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => {
              const next = [...links];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              setLinks(next);
            }}>↑</button>
            <button type="button" aria-label="Move down" disabled={i === links.length - 1} onClick={() => {
              const next = [...links];
              [next[i + 1], next[i]] = [next[i], next[i + 1]];
              setLinks(next);
            }}>↓</button>
            <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>×</button>
          </div>
        </div>
      ))}

      <Button variant="text" size="sm" onClick={() => setLinks([...links, { label: "", href: "", icon: "website" }])}>
        + Add custom link
      </Button>
    </div>
  );
}

function BeforeAfterEditor({ block, onChange, imageOptions }: { block: Extract<Block, { type: "bafter" }>; onChange: (b: Block) => void; imageOptions: { src: string; label: string }[] }) {
  const side = (which: "before" | "after") => (
    <div className={styles.listWrap}>
      <select
        value={imageOptions.some((g) => g.src === block[which]) || !block[which] ? block[which] : ""}
        onChange={(e) => onChange({ ...block, [which]: e.target.value })}
      >
        <option value="">Choose an image…</option>
        {imageOptions.map((g) => (
          <option key={g.src} value={g.src}>{g.label}</option>
        ))}
      </select>
      <input
        value={block[which]}
        placeholder={`Image URL for “${which}”`}
        onChange={(e) => onChange({ ...block, [which]: e.target.value.trim() })}
      />
      <input
        value={block[which === "before" ? "labelBefore" : "labelAfter"] ?? ""}
        placeholder={`Label — ${which}`}
        onChange={(e) => onChange({ ...block, [which === "before" ? "labelBefore" : "labelAfter"]: e.target.value })}
      />
    </div>
  );
  return (
    <div className={styles.imageWrap}>
      <p className={styles.blockNote}>Pick two photos of the same frame — readers drag the slider between them.</p>
      <strong>Before</strong>
      {side("before")}
      <strong>After</strong>
      {side("after")}
    </div>
  );
}

/* Image block that also accepts video: a YouTube/Vimeo link or an uploaded
   MP4/WebM renders as a video, everything else as a photo. */
function MediaBlockEditor({
  block,
  onChange,
  imageOptions,
}: {
  block: Extract<Block, { type: "image" }>;
  onChange: (b: Block) => void;
  imageOptions: { src: string; label: string }[];
}) {
  const toast = useToast();
  const src = block.src ?? "";
  const isVideoFile = /\.(mp4|webm)(\?|$)/i.test(src);
  const provider = src.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  const isVimeo = /vimeo\.com\/\d{6,}/i.test(src);
  const kind: "empty" | "image" | "video" | "external" =
    !src ? "empty" : isVideoFile ? "video" : provider || isVimeo ? "external" : "image";

  async function upload(file: File) {
    try {
      const { src: url } = await api.upload(file);
      onChange({ ...block, src: url });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className={styles.imageWrap}>
      {kind === "video" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={src} className={styles.imagePreview} controls muted playsInline preload="metadata" />
      ) : kind === "external" ? (
        <div className={styles.embedPreview}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          <span>{provider ? "YouTube video" : "Vimeo video"} — plays inline on the site</span>
        </div>
      ) : kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={block.alt ?? ""} className={styles.imagePreview} />
      ) : null}

      <select
        value={imageOptions.some((g) => g.src === src) || !src ? src : ""}
        onChange={(e) => onChange({ ...block, src: e.target.value })}
      >
        <option value="">Choose an image…</option>
        {imageOptions.map((g) => (
          <option key={g.src} value={g.src}>{g.label}</option>
        ))}
      </select>
      <input
        value={src}
        placeholder="…or paste an image, YouTube/Vimeo link, or MP4 URL"
        onChange={(e) => onChange({ ...block, src: e.target.value.trim() })}
      />
      <div className={styles.uploadRow}>
        <label className={styles.uploadBtn}>
          Upload image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        <label className={styles.uploadBtn}>
          Upload video
          <input
            type="file"
            accept="video/mp4,video/webm"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <input
        value={block.alt ?? ""}
        placeholder={kind === "image" ? "Alt text (required)" : "Caption / title for screen readers"}
        onChange={(e) => onChange({ ...block, alt: e.target.value })}
      />
      <input
        value={block.caption ?? ""}
        placeholder="Caption"
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
      />
    </div>
  );
}

function RowBlockEditor({ block, onChange, imageOptions }: { block: Block; onChange: (b: Block) => void; imageOptions: { src: string; label: string }[] }) {
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  if (block.type !== "row") return null;
  const patchItems = (items: RowItem[]) => onChange({ ...block, items });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= block.items.length) return;
    const next = [...block.items];
    [next[i], next[j]] = [next[j], next[i]];
    patchItems(next);
  };
  const patchAt = (i: number, next: RowItem) => patchItems(block.items.map((x, idx) => (idx === i ? next : x)));
  return (
    <div className={styles.rowEditor}>
      <div className={styles.rowGridHead}>
        <span>
          {block.items.length} slide{block.items.length === 1 ? "" : "s"} — mix photos, clips, YouTube/Vimeo links and quote cards in one rail
        </span>
      </div>
      <ul className={styles.rowList}>
        {block.items.map((it, i) => {
          if (it.kind === "quote") {
            return (
              <li key={i} className={styles.rowItem}>
                <span className={`${styles.rowThumb} ${styles.rowThumbQuote}`} aria-hidden="true">“</span>
                <div className={styles.rowQuoteFields}>
                  <textarea
                    className={styles.rowAlt}
                    value={it.html.replace(/<[^>]+>/g, "")}
                    placeholder={`Quote for slide #${i + 1}`}
                    rows={2}
                    onChange={(e) => patchAt(i, { ...it, html: e.target.value })}
                  />
                  <div className={styles.rowQuoteMeta}>
                    <input
                      value={it.author ?? ""}
                      placeholder="Name"
                      onChange={(e) => patchAt(i, { ...it, author: e.target.value })}
                    />
                    <input
                      value={it.role ?? ""}
                      placeholder="Title, company"
                      onChange={(e) => patchAt(i, { ...it, role: e.target.value })}
                    />
                  </div>
                </div>
                <span className={styles.rowMoves}>
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move later">↓</button>
                </span>
                <button type="button" className={styles.rowRemove} onClick={() => patchItems(block.items.filter((_, idx) => idx !== i))} aria-label={`Remove slide ${i + 1}`}>×</button>
              </li>
            );
          }
          const video = it.src ? classifyVideo(it.src) : null;
          return (
            <li key={i} className={styles.rowItem}>
              <span className={styles.rowThumb}>
                {video?.kind === "file" ? (
                  <video src={it.src} muted playsInline preload="metadata" />
                ) : video?.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.poster} alt="" loading="lazy" />
                ) : it.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.src} alt="" loading="lazy" />
                ) : (
                  <span className={styles.rowThumbEmpty}>?</span>
                )}
              </span>
              <input
                className={styles.rowAlt}
                value={it.src}
                placeholder="Paste an image, video, YouTube or Vimeo link"
                onChange={(e) => patchAt(i, { ...it, src: e.target.value })}
              />
              <input
                className={styles.rowAlt}
                value={it.alt}
                placeholder={`Caption / alt for #${i + 1}`}
                onChange={(e) => patchAt(i, { ...it, alt: e.target.value })}
              />
              <select
                aria-label={`Size for item ${i + 1}`}
                value={it.size ?? "auto"}
                onChange={(e) => patchAt(i, { ...it, size: e.target.value as RowSize })}
              >
                <option value="auto">Auto</option>
                <option value="square">Square</option>
                <option value="portrait">Tall</option>
                <option value="wide">Wide</option>
              </select>
              <span className={styles.rowMoves}>
                <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier">↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Move later">↓</button>
              </span>
              <label className={styles.rowReplace}>
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { src } = await api.upload(file);
                      patchAt(i, { ...it, src });
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Upload failed");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button type="button" className={styles.rowRemove} onClick={() => patchItems(block.items.filter((_, idx) => idx !== i))} aria-label={`Remove item ${i + 1}`}>×</button>
            </li>
          );
        })}
      </ul>
      <div className={styles.rowFoot}>
        <button type="button" className={styles.rowAddBtn} onClick={() => setPickerOpen(true)}>
          + Add photos or videos
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => patchItems([...block.items, { kind: "quote", html: "", author: "", role: "" }])}
        >
          + Quote slide
        </button>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => patchItems([...block.items, { src: "", alt: "" }])}
        >
          + Blank slot
        </button>
        <MediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          imageOptions={imageOptions}
          onPick={(added) => patchItems([...block.items, ...added.filter((a) => a.src)])}
        />
      </div>
      <input value={block.caption ?? ""} placeholder="Caption (optional)" onChange={(e) => onChange({ ...block, caption: e.target.value })} />
    </div>
  );
}

/* Admin-style popup: pick media via upload, external link, or the library. */
function MediaPicker({
  open,
  onClose,
  onPick,
  multiple = true,
  imageOptions,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (items: { src: string; alt: string }[]) => void;
  multiple?: boolean;
  imageOptions: { src: string; label: string }[];
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"upload" | "link" | "library">("upload");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  if (!open) return null;

  const finish = (items: { src: string; alt: string }[]) => {
    if (items.length) onPick(items);
    setPicked([]);
    setLink("");
    onClose();
  };

  return (
    <div className={styles.pickerOverlay} role="dialog" aria-modal="true" aria-label="Add photos or videos" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.picker}>
        <header className={styles.pickerHead}>
          <h3>Add photos or videos</h3>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className={styles.pickerTabs} role="tablist">
          {(["upload", "link", "library"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? styles.pickerTabOn : styles.pickerTab} onClick={() => setTab(t)}>
              {t === "upload" ? "Upload" : t === "link" ? "Link" : "Library"}
            </button>
          ))}
        </div>

        {tab === "upload" ? (
          <label className={styles.pickerDrop}>
            <input
              type="file"
              multiple={multiple}
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              hidden
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length) return;
                setBusy(true);
                const out: { src: string; alt: string }[] = [];
                for (const file of Array.from(files)) {
                  try {
                    const { src } = await api.upload(file);
                    out.push({ src, alt: file.name.replace(/\.[^.]+$/, "") });
                  } catch (err) {
                    toast(err instanceof Error ? err.message : `Could not upload ${file.name}`);
                  }
                }
                setBusy(false);
                finish(out);
                e.target.value = "";
              }}
            />
            <span>{busy ? "Uploading…" : "Drop files here or click to browse"}</span>
            <small>Photos (JPG, PNG, WebP, GIF) and clips (MP4, WebM) — hosted in your storage</small>
          </label>
        ) : null}

        {tab === "link" ? (
          <div className={styles.pickerLink}>
            <input
              value={link}
              placeholder="https://example.com/photo.jpg or a video URL…"
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = link.trim(); if (/^https?:\/\//i.test(v)) finish([{ src: v, alt: "" }]); } }}
            />
            <small>Direct image or video URLs only — YouTube links belong in a Video block.</small>
            <button
              type="button"
              className={styles.pickerGo}
              disabled={!/^https?:\/\//i.test(link.trim())}
              onClick={() => finish([{ src: link.trim(), alt: "" }])}
            >
              Add link
            </button>
          </div>
        ) : null}

        {tab === "library" ? (
          <div className={styles.pickerGrid}>
            {imageOptions.length === 0 ? <p className={styles.pickerEmpty}>Nothing uploaded yet.</p> : null}
            {imageOptions.map((g) => {
              const on = picked.includes(g.src);
              return (
                <button
                  key={g.src}
                  type="button"
                  className={on ? styles.pickerCellOn : styles.pickerCell}
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (p.includes(g.src) ? p.filter((x) => x !== g.src) : multiple ? [...p, g.src] : [g.src]))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt="" loading="lazy" />
                </button>
              );
            })}
            <div className={styles.pickerFoot}>
              <span>{picked.length} selected</span>
              <button type="button" className={styles.pickerGo} disabled={!picked.length} onClick={() => finish(picked.map((src) => ({ src, alt: "" })))}>
                Add selected
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


function Preview({
  draft,
  authorName,
  topicName,
  dateLabel,
  words,
}: {
  draft: EditorDraft;
  authorName: string;
  topicName: string;
  dateLabel: string;
  words: number;
}) {
  return (
    <div className={styles.preview}>
      <p className={styles.previewKicker}>Live preview — exactly how the story will run</p>
      <div className={styles.previewHead}>
        <span className={styles.kickerTag}>{topicName || "Uncategorised"}</span>
        <h1 className={styles.previewTitle}>{draft.title || "Untitled story"}</h1>
        {draft.summary ? <p className={styles.previewDesc}>{draft.summary}</p> : null}
        <p className={styles.previewByline}>
          {authorName} · {dateLabel} · ~{Math.max(1, Math.round(words / 220))} min read
        </p>
      </div>
      {draft.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.previewCover} src={draft.cover} alt={draft.coverAlt} />
      ) : null}
      <PostContent blocks={draft.blocks} />
    </div>
  );
}

const CHART_KINDS: { kind: ChartBlockType["kind"]; label: string }[] = [
  { kind: "column", label: "Column (vertical bars)" },
  { kind: "bar", label: "Bar (horizontal)" },
  { kind: "grouped", label: "Grouped bars" },
  { kind: "stacked", label: "Stacked bars" },
  { kind: "line", label: "Line" },
  { kind: "area", label: "Area" },
  { kind: "pie", label: "Pie" },
  { kind: "donut", label: "Donut" },
  { kind: "scatter", label: "Scatter plot" },
  { kind: "radar", label: "Radar / spider" },
  { kind: "gauge", label: "Gauge" },
  { kind: "stat", label: "Key figure" },
  { kind: "funnel", label: "Funnel" },
  { kind: "progress", label: "Progress bars" },
  { kind: "timeline", label: "Timeline" },
  { kind: "flow", label: "Flow chart" },
];

const SEED: [string, number][] = [
  ["First", 10],
  ["Second", 20],
  ["Third", 14],
];

/** A sensible starting shape for any chart kind. */
function defaultChart(kind: ChartBlockType["kind"]): ChartBlockType {
  const data = SEED.map(([label, value]) => ({ label, value }));
  switch (kind) {
    case "grouped":
    case "stacked":
      return { kind, title: "Chart title", categories: ["A", "B", "C"], series: [{ name: "Series 1", values: [10, 20, 14] }] };
    case "line":
    case "area":
    case "bar":
    case "column":
    case "pie":
    case "donut":
    case "funnel":
    case "progress":
      return { kind, title: "Chart title", data };
    case "scatter":
      return { kind, title: "Chart title", xLabel: "X", yLabel: "Y", points: [{ x: 1, y: 3 }, { x: 2, y: 6 }, { x: 3, y: 4 }] };
    case "radar":
      return { kind, title: "Chart title", axes: ["Speed", "Cost", "Safety", "Reach"], series: [{ name: "Option A", values: [8, 5, 7, 6] }] };
    case "gauge":
      return { kind, title: "Chart title", gauge: { value: 62, max: 100, unit: "%", label: "Target" } };
    case "stat":
      return { kind, title: "Key figure", stat: { value: "62%", delta: "18%", trend: "up", note: "vs last quarter" } };
    case "timeline":
      return { kind, title: "Chart title", events: [{ label: "First event", detail: "What happened" }, { label: "Second event", detail: "What happened next" }] };
    case "flow":
      return {
        kind,
        title: "Flow chart title",
        nodes: [
          { id: "start", label: "Start", shape: "start" },
          { id: "process", label: "Step one", shape: "process" },
          { id: "decision", label: "Decision?", shape: "decision" },
          { id: "end", label: "Done", shape: "end" },
        ],
        edges: [
          { from: "start", to: "process" },
          { from: "process", to: "decision" },
          { from: "decision", to: "end", label: "Yes", style: "solid" },
        ],
        layout: "vertical",
        connector: "arrow",
      };
  }
}

function readFlowNodes(loose: Record<string, unknown>): FlowNode[] {
  if (Array.isArray(loose.nodes)) {
    const nodes = loose.nodes
      .filter((item): item is FlowNode => Boolean(item) && typeof item === "object" && typeof (item as FlowNode).id === "string" && typeof (item as FlowNode).label === "string")
      .slice(0, 40);
    if (nodes.length) return nodes;
  }

  const steps = Array.isArray(loose.steps)
    ? loose.steps.filter((step): step is string => typeof step === "string").map((step) => step.slice(0, 200))
    : [];

  return steps.map((label, i, all) => ({
    id: `step-${i + 1}`,
    label,
    shape: i === 0 ? "start" : i === all.length - 1 ? "end" : "process",
  }));
}

function readFlowEdges(loose: Record<string, unknown>, nodes: FlowNode[]): FlowEdge[] {
  const ids = new Set(nodes.map((node) => node.id));
  if (Array.isArray(loose.edges)) {
    return loose.edges
      .filter((item): item is FlowEdge => Boolean(item) && typeof item === "object")
      .filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to)
      .slice(0, 80);
  }

  return nodes.slice(1).map((node, i) => ({ from: nodes[i].id, to: node.id, style: "solid" }));
}

function ChartEditor({ chart, onChange }: { chart: ChartBlockType; onChange: (c: ChartBlockType) => void }) {
  const loose = chart as Record<string, unknown> & { kind: ChartBlockType["kind"] };
  const set = (patch: Record<string, unknown>) => onChange({ ...loose, ...patch } as ChartBlockType);

  const data = (loose.data as { label: string; value: number }[] | undefined) ?? [];
  const stat = (loose.stat as { value?: string; delta?: string; trend?: "up" | "down" | "flat"; note?: string } | undefined) ?? { value: "" };
  const flowNodes = readFlowNodes(loose);
  const flowEdges = readFlowEdges(loose, flowNodes);

  const setFlow = (nodes: FlowNode[], edges: FlowEdge[], patch: Record<string, unknown> = {}) => {
    set({ nodes, edges, steps: undefined, ...patch });
  };

  const addFlowNode = () => {
    let index = flowNodes.length + 1;
    while (flowNodes.some((node) => node.id === `node-${index}`)) index += 1;
    const id = `node-${index}`;
    const node: FlowNode = { id, label: `Step ${flowNodes.length + 1}`, shape: "process" };
    const previous = flowNodes[flowNodes.length - 1];
    const nextEdges = previous ? [...flowEdges, { from: previous.id, to: id, style: "solid" as const }] : flowEdges;
    setFlow([...flowNodes, node], nextEdges);
  };

  const updateFlowNode = (index: number, patch: Partial<FlowNode>) => {
    setFlow(flowNodes.map((node, i) => (i === index ? { ...node, ...patch } : node)), flowEdges);
  };

  const removeFlowNode = (id: string) => {
    setFlow(
      flowNodes.filter((node) => node.id !== id),
      flowEdges.filter((edge) => edge.from !== id && edge.to !== id),
    );
  };

  const addFlowEdge = () => {
    const from = flowNodes[flowNodes.length - 2]?.id ?? flowNodes[0]?.id;
    const to = flowNodes[flowNodes.length - 1]?.id;
    if (!from || !to || from === to) return;
    if (flowEdges.some((edge) => edge.from === from && edge.to === to)) return;
    setFlow(flowNodes, [...flowEdges, { from, to, style: "solid" }]);
  };

  const updateFlowEdge = (index: number, patch: Partial<FlowEdge>) => {
    const next = flowEdges.map((edge, i) => (i === index ? { ...edge, ...patch } : edge));
    if (next.some((edge) => edge.from === edge.to)) return;
    setFlow(flowNodes, next);
  };

  return (
    <div className={styles.chartEditor}>
      <div className={styles.chartRow}>
        <select value={chart.kind} onChange={(e) => onChange(defaultChart(e.target.value as ChartBlockType["kind"]))}>
          {CHART_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>{k.label}</option>
          ))}
        </select>
        <input value={(loose.title as string) ?? ""} placeholder="Chart title" onChange={(e) => set({ title: e.target.value })} />
      </div>

      {/* label/value lists */}
      {["column", "bar", "line", "area", "pie", "donut", "funnel", "progress"].includes(chart.kind) ? (
        <div className={styles.chartRows}>
          {data.map((d, i) => (
            <div key={i} className={styles.chartDataRow}>
              <input
                value={d.label}
                placeholder="Label"
                onChange={(e) => set({ data: data.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
              />
              <input
                type="number"
                value={d.value}
                onChange={(e) => set({ data: data.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)) })}
              />
              <button type="button" className={styles.linkBtn} onClick={() => set({ data: data.filter((_, j) => j !== i) })} aria-label="Remove">×</button>
            </div>
          ))}
          <button type="button" className={styles.linkBtn} onClick={() => set({ data: [...data, { label: "", value: 0 }] })}>+ Add value</button>
        </div>
      ) : null}

      {/* key figure */}
      {chart.kind === "stat" ? (
        <div className={styles.chartRows}>
          <div className={styles.chartRow}>
            <input value={stat.value ?? ""} placeholder="Value (62%)" onChange={(e) => set({ stat: { ...stat, value: e.target.value } })} />
            <input value={stat.delta ?? ""} placeholder="Change (18%)" onChange={(e) => set({ stat: { ...stat, delta: e.target.value } })} />
          </div>
          <div className={styles.chartRow}>
            <select value={stat.trend ?? "flat"} onChange={(e) => set({ stat: { ...stat, trend: e.target.value as "up" | "down" | "flat" } })}>
              <option value="up">Trend: up</option>
              <option value="down">Trend: down</option>
              <option value="flat">Trend: flat</option>
            </select>
            <input value={stat.note ?? ""} placeholder="Supporting note" onChange={(e) => set({ stat: { ...stat, note: e.target.value } })} />
          </div>
        </div>
      ) : null}

      {/* grouped / stacked / radar */}
      {["grouped", "stacked", "radar"].includes(chart.kind) ? (
        <SeriesEditor loose={loose} set={set} />
      ) : null}

      {/* scatter */}
      {chart.kind === "scatter" ? (
        <div className={styles.chartRows}>
          <div className={styles.chartRow}>
            <input value={(loose.xLabel as string) ?? ""} placeholder="X axis label" onChange={(e) => set({ xLabel: e.target.value })} />
            <input value={(loose.yLabel as string) ?? ""} placeholder="Y axis label" onChange={(e) => set({ yLabel: e.target.value })} />
          </div>
          {((loose.points as { x: number; y: number }[]) ?? []).map((pt, i) => (
            <div key={i} className={styles.chartDataRow}>
              <input type="number" value={pt.x} placeholder="x" onChange={(e) => set({ points: (loose.points as { x: number; y: number }[]).map((p, j) => (j === i ? { ...p, x: Number(e.target.value) } : p)) })} />
              <input type="number" value={pt.y} placeholder="y" onChange={(e) => set({ points: (loose.points as { x: number; y: number }[]).map((p, j) => (j === i ? { ...p, y: Number(e.target.value) } : p)) })} />
              <button type="button" className={styles.linkBtn} onClick={() => set({ points: (loose.points as { x: number; y: number }[]).filter((_, j) => j !== i) })} aria-label="Remove">×</button>
            </div>
          ))}
          <button type="button" className={styles.linkBtn} onClick={() => set({ points: [...((loose.points as { x: number; y: number }[]) ?? []), { x: 0, y: 0 }] })}>+ Add point</button>
        </div>
      ) : null}

      {/* gauge */}
      {chart.kind === "gauge" ? (
        <div className={styles.chartRows}>
          <div className={styles.chartDataRow}>
            <input type="number" value={(loose.gauge as { value: number }).value} placeholder="Value" onChange={(e) => set({ gauge: { ...(loose.gauge as object), value: Number(e.target.value) } })} />
            <input type="number" value={(loose.gauge as { max: number }).max} placeholder="Max" onChange={(e) => set({ gauge: { ...(loose.gauge as object), max: Number(e.target.value) } })} />
            <input value={(loose.gauge as { unit?: string }).unit ?? ""} placeholder="Unit" onChange={(e) => set({ gauge: { ...(loose.gauge as object), unit: e.target.value } })} />
          </div>
          <input value={(loose.gauge as { label?: string }).label ?? ""} placeholder="Caption under the gauge" onChange={(e) => set({ gauge: { ...(loose.gauge as object), label: e.target.value } })} />
        </div>
      ) : null}

      {/* timeline */}
      {chart.kind === "timeline" ? (
        <div className={styles.chartRows}>
          {((loose.events as { label: string; detail?: string }[]) ?? []).map((ev, i) => (
            <div key={i} className={styles.chartDataRow}>
              <input value={ev.label} placeholder="Event" onChange={(e) => set({ events: (loose.events as object[]).map((x, j) => (j === i ? { ...(x as object), label: e.target.value } : x)) })} />
              <input value={ev.detail ?? ""} placeholder="Detail" onChange={(e) => set({ events: (loose.events as object[]).map((x, j) => (j === i ? { ...(x as object), detail: e.target.value } : x)) })} />
              <button type="button" className={styles.linkBtn} onClick={() => set({ events: (loose.events as object[]).filter((_, j) => j !== i) })} aria-label="Remove">×</button>
            </div>
          ))}
          <button type="button" className={styles.linkBtn} onClick={() => set({ events: [...((loose.events as object[]) ?? []), { label: "", detail: "" }] })}>+ Add event</button>
        </div>
      ) : null}

      {/* flow nodes + connections */}
      {chart.kind === "flow" ? (
        <div className={styles.chartSection}>
          <div className={styles.chartSectionHead}>
            <span>Nodes</span>
            <span className={styles.chartCount}>{flowNodes.length}</span>
          </div>
          <div className={styles.chartRows}>
            {flowNodes.map((node, i) => (
              <div key={node.id} className={styles.flowNodeRow}>
                <select
                  value={node.shape ?? "process"}
                  aria-label={`Shape for ${node.label || `node ${i + 1}`}`}
                  onChange={(e) => updateFlowNode(i, { shape: e.target.value as FlowNodeShape })}
                >
                  {FLOW_SHAPE_OPTIONS.map((shape) => (
                    <option key={shape.value} value={shape.value}>{shape.label}</option>
                  ))}
                </select>
                <input
                  value={node.label}
                  placeholder={`Node ${i + 1}`}
                  aria-label={`Label for node ${i + 1}`}
                  onChange={(e) => updateFlowNode(i, { label: e.target.value })}
                />
                <button type="button" className={styles.linkBtn} onClick={() => removeFlowNode(node.id)} aria-label={`Remove ${node.label || `node ${i + 1}`}`}>×</button>
                <input
                  className={styles.flowDetailInput}
                  value={node.detail ?? ""}
                  placeholder="Detail (optional)"
                  aria-label={`Detail for node ${i + 1}`}
                  onChange={(e) => updateFlowNode(i, { detail: e.target.value })}
                />
              </div>
            ))}
            <button type="button" className={styles.linkBtn} onClick={addFlowNode}>+ Add node</button>
          </div>

          <div className={styles.chartSectionHead}>
            <span>Connections</span>
            <span className={styles.chartCount}>{flowEdges.length}</span>
          </div>
          <div className={styles.chartRows}>
            {flowEdges.map((edge, i) => (
              <div key={`${edge.from}-${edge.to}-${i}`} className={styles.flowEdgeRow}>
                <span className={styles.flowEdgeRoute}>
                  <select
                    value={edge.from}
                    aria-label={`Connection ${i + 1} from`}
                    onChange={(e) => updateFlowEdge(i, { from: e.target.value })}
                  >
                    {flowNodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.label || node.id}</option>
                    ))}
                  </select>
                  <span aria-hidden="true">→</span>
                  <select
                    value={edge.to}
                    aria-label={`Connection ${i + 1} to`}
                    onChange={(e) => updateFlowEdge(i, { to: e.target.value })}
                  >
                    {flowNodes.map((node) => (
                      <option key={node.id} value={node.id}>{node.label || node.id}</option>
                    ))}
                  </select>
                </span>
                <input
                  value={edge.label ?? ""}
                  placeholder="Label (Yes / No)"
                  aria-label={`Label for connection ${i + 1}`}
                  onChange={(e) => updateFlowEdge(i, { label: e.target.value })}
                />
                <select
                  value={edge.style ?? "solid"}
                  aria-label={`Style for connection ${i + 1}`}
                  onChange={(e) => updateFlowEdge(i, { style: e.target.value as FlowEdge["style"] })}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => setFlow(flowNodes, flowEdges.filter((_, j) => j !== i))}
                  aria-label={`Remove connection ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className={styles.linkBtn} onClick={addFlowEdge} disabled={flowNodes.length < 2}>
              + Add connection
            </button>
          </div>

          <div className={styles.chartRow}>
            <select
              value={loose.layout === "horizontal" ? "horizontal" : "vertical"}
              aria-label="Flow direction"
              onChange={(e) => set({ layout: e.target.value })}
            >
              <option value="vertical">Direction: top to bottom</option>
              <option value="horizontal">Direction: left to right</option>
            </select>
            <select
              value={loose.connector === "line" || loose.connector === "number" ? loose.connector : "arrow"}
              aria-label="Connection style"
              onChange={(e) => set({ connector: e.target.value })}
            >
              <option value="arrow">Connections: arrows</option>
              <option value="line">Connections: lines</option>
              <option value="number">Connections: numbered</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className={styles.chartRow}>
        <input value={(loose.unit as string) ?? ""} placeholder="Unit (%, ms, k$)" onChange={(e) => set({ unit: e.target.value })} />
        <input value={(loose.caption as string) ?? ""} placeholder="Caption (optional)" onChange={(e) => set({ caption: e.target.value })} />
      </div>
    </div>
  );
}

function SeriesEditor({
  loose,
  set,
}: {
  loose: Record<string, unknown>;
  set: (patch: Record<string, unknown>) => void;
}) {
  const categories = (loose.categories as string[] | undefined) ?? [];
  const series = (loose.series as { name: string; values: number[] }[] | undefined) ?? [];
  const isRadar = loose.kind === "radar";

  return (
    <div className={styles.chartRows}>
      <input
        value={(isRadar ? (loose.axes as string[]) : categories).join(", ")}
        placeholder={isRadar ? "Axes (comma separated)" : "Categories (comma separated)"}
        onChange={(e) =>
          set({ [isRadar ? "axes" : "categories"]: e.target.value.split(",").map((v) => v.trim()) })
        }
      />
      {series.map((s, si) => (
        <div key={si} className={styles.chartDataRow}>
          <input value={s.name} placeholder="Series name" onChange={(e) => set({ series: series.map((x, j) => (j === si ? { ...x, name: e.target.value } : x)) })} />
          <input
            value={s.values.join(", ")}
            placeholder="10, 20, 14"
            onChange={(e) =>
              set({ series: series.map((x, j) => (j === si ? { ...x, values: e.target.value.split(",").map((v) => Number(v.trim()) || 0) } : x)) })
            }
          />
          <button type="button" className={styles.linkBtn} onClick={() => set({ series: series.filter((_, j) => j !== si) })} aria-label="Remove">×</button>
        </div>
      ))}
      <button type="button" className={styles.linkBtn} onClick={() => set({ series: [...series, { name: `Series ${series.length + 1}`, values: [] }] })}>
        + Add series
      </button>
    </div>
  );
}
