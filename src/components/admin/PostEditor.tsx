"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum, type ApiPost, type ApiUpload, ApiTopic } from "./api";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Feedback";
import { StatusChip, statusTone } from "@/components/admin/kit";
import type { Block, ChartBlock as ChartBlockType, FlowEdge, FlowNode, FlowNodeShape, RowItem, RowSize } from "@/lib/types";
import { classifyVideo } from "@/lib/external-video";
import { ChartBlockView, FLOW_SHAPE_OPTIONS } from "@/components/blog/ChartBlock";

import { RichEditor } from "./RichEditor";
import { PostContent } from "@/components/blog/PostContent";
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
    coverFocal: stripCoverMeta(p.cover_alt).focal ?? 30,
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
  icon: React.ReactNode;
}[] = [
  { type: "p", label: "Text", hint: "A plain paragraph — just start writing", group: "Text", icon: blockIcon("M4 7h16M4 12h16M4 17h10") },
  { type: "h2", label: "Heading", hint: "A section title readers can scan", group: "Text", icon: blockIcon("M5 5v14M15 5v14M5 12h10") },
  { type: "h3", label: "Subheading", hint: "A smaller heading inside a section", group: "Text", icon: blockIcon("M5 8v8M13 8v8M5 12h8") },
  { type: "quote", label: "Quote", hint: "Pull out a line worth repeating", group: "Text", icon: blockIcon("M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4") },
  { type: "callout", label: "Callout", hint: "A note, tip or warning", group: "Text", icon: blockIcon("M12 8v5M12 17h.01M3 5h18v14H3z") },
  { type: "list", label: "List", hint: "Bulleted or numbered points", group: "Text", icon: blockIcon("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01") },
  { type: "image", label: "Image", hint: "Upload a photo or link to one", group: "Media", icon: blockIcon("M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6") },
  { type: "row", label: "Media carousel", hint: "A swipeable strip of photos and clips", group: "Media", icon: blockIcon("M2 7h5v10H2zM9 7h6v10H9zM17 7h5v10h-5z") },
  { type: "video", label: "Video", hint: "YouTube, Vimeo or an MP4 upload", group: "Media", icon: blockIcon("M3 6h18v12H3zM10 9.5l5 2.5-5 2.5z") },
  { type: "code", label: "Code", hint: "A snippet with a filename and language", group: "Media", icon: blockIcon("M9 8l-4 4 4 4M15 8l4 4-4 4") },
  { type: "related", label: "Read next", hint: "Link another story as a card", group: "Structure", icon: blockIcon("M4 5h16v14H4zM8 9h8M8 13h5") },
  { type: "divider", label: "Divider", hint: "A clean break between ideas", group: "Structure", icon: blockIcon("M3 12h18") },
  { type: "table", label: "Table", hint: "Rows and columns of data", group: "Data", icon: blockIcon("M3 5h18v14H3zM3 10h18M3 15h18M9 5v14") },
  { type: "chart", label: "Chart", hint: "Bars, lines, pies, stats and flows", group: "Data", icon: blockIcon("M4 20V10M10 20V4M16 20v-7M22 20H2") },
];

const blockLabel = (type: Block["type"]) => BLOCK_PRESETS.find((b) => b.type === type)?.label ?? "Block";

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
    case "divider":
      return { type };
    default:
      return { type: "p", html: "" };
  }
}

export function PostEditor({ postId }: { postId: string }) {
  const router = useRouter();
  const toast = useToast();
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
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [paletteAfter, setPaletteAfter] = useState<number | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActive, setPaletteActive] = useState(0);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const slugTouched = useRef(Boolean(postId && postId !== "new"));

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
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return BLOCK_PRESETS;
    return BLOCK_PRESETS.filter((b) => `${b.label} ${b.hint} ${b.group} ${b.type}`.toLowerCase().includes(q));
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

  const topicName = state.topics.find((t) => t.slug === draft.category)?.name ?? draft.category;
  const dateLabel = draft.date
    ? new Date(`${draft.date}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "No date yet";
  const authorInitials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      className={styles.editor}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (!saving) void save("draft");
        } else if (e.key === "Escape") {
          if (paletteAfter !== null) closePalette();
          else if (settingsOpen) setSettingsOpen(false);
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
          <button
            type="button"
            role="tab"
            aria-selected={tab === "write"}
            className={tab === "write" ? styles.viewSwitchOn : styles.viewSwitchBtn}
            onClick={() => setTab("write")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
            </svg>
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            className={tab === "preview" ? styles.viewSwitchOn : styles.viewSwitchBtn}
            onClick={() => setTab("preview")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            Preview
          </button>
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
          <button type="button" className={styles.settingsToggle} aria-label="Open post details" title="Post details" onClick={() => setSettingsOpen(true)}>
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
              <button type="button" className={`${styles.moreItem} ${styles.moreMobile}`} onClick={() => { setSettingsOpen(true); }}>
                Post details
              </button>
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
        </main>

        {settingsOpen ? (
          <button type="button" className={styles.sideScrim} aria-label="Close post details" onClick={() => setSettingsOpen(false)} />
        ) : null}
        <aside className={settingsOpen ? `${styles.sideRail} ${styles.sideRailOpen}` : styles.sideRail} aria-label="Post details">
          <div className={styles.sideRailHead}>
            <h2 className={styles.sideRailTitle}>Post details</h2>
            <button type="button" className={styles.sideClose} onClick={() => setSettingsOpen(false)} aria-label="Close post details">×</button>
          </div>
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
    </div>
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

function BlockEditor({ block, onChange, imageOptions, postOptions = [] }: { block: Block; onChange: (b: Block) => void; imageOptions: { src: string; label: string }[]; postOptions?: { slug: string; title: string; summary: string; cover: string }[] }) {
  const toast = useToast();
  const headingRef = useRef<HTMLTextAreaElement>(null);
  const headingText = block.type === "h2" || block.type === "h3" ? block.text : null;

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [headingText, block.type]);

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
            onChange={(e) => onChange({ ...block, tone: e.target.value as "note" | "tip" | "warning" })}
          >
            <option value="note">Note</option>
            <option value="tip">Tip</option>
            <option value="warning">Warning</option>
          </select>
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
                onChange={(e) => onChange({ ...block, items: block.items.map((x, idx) => (idx === i ? e.target.value : x)) })}
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
        </div>
      );
    case "chart":
      return <ChartEditor chart={block.chart} onChange={(chart) => onChange({ type: "chart", chart })} />;
    case "divider":
      return <hr className={styles.divider} />;
    default: {
      const html = "html" in block ? block.html : "";
      return (
        <RichEditor
          value={html}
          onChange={(next) => onChange({ ...(block as { type: "p"; html: string }), html: next })}
        />
      );
    }
  }
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
