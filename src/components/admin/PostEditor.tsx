"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum, type ApiPost, type ApiUpload, ApiTopic } from "./api";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Feedback";
import { StatusChip, statusTone } from "@/components/admin/kit";
import type { Block, ChartBlock as ChartBlockType, FlowEdge, FlowNode, FlowNodeShape } from "@/lib/types";
import { ChartBlockView, FLOW_SHAPE_OPTIONS } from "@/components/blog/ChartBlock";

import { RichEditor } from "./RichEditor";
import { PostContent } from "@/components/blog/PostContent";
import styles from "./PostEditor.module.scss";

const slugifyTitle = (v: string) =>
  v.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

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
    coverAlt: p.cover_alt ?? "",
    coverHeight: p.cover_height ?? null,
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
    cover_height: d.coverHeight,
    date: d.date,
    reading_minutes: d.readingMinutes,
    blocks: d.blocks.map(({ __k, ...rest }: Block & { __k?: string }) => rest),
    featured: d.featured,
  };
}

const BLOCK_TYPES: { type: Block["type"]; label: string }[] = [
  { type: "p", label: "Paragraph" },
  { type: "h2", label: "Heading 2" },
  { type: "h3", label: "Heading 3" },
  { type: "quote", label: "Quote" },
  { type: "callout", label: "Callout" },
  { type: "list", label: "List" },
  { type: "code", label: "Code" },
  { type: "image", label: "Image" },
  { type: "row", label: "Image row" },
  { type: "video", label: "Video" },
  { type: "related", label: "Related article" },
  { type: "table", label: "Table" },
  { type: "chart", label: "Chart" },
  { type: "divider", label: "Divider" },
];

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
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [tab, setTab] = useState<"write" | "preview" | "settings">("write");
  const [addOpen, setAddOpen] = useState<number | null>(null);
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
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  function patchBlock(i: number, block: Block) {
    setDraft((d) => (d ? { ...d, blocks: d.blocks.map((b, idx) => (idx === i ? block : b)) } : d));
  }

  function removeBlock(i: number) {
    setDraft((d) => (d ? { ...d, blocks: d.blocks.filter((_, idx) => idx !== i) } : d));
  }

  function moveBlock(i: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, blocks: next };
    });
  }

  function insertBlock(i: number, type: Block["type"]) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.blocks];
      next.splice(i + 1, 0, { ...newBlock(type), __k: Math.random().toString(36).slice(2) } as unknown as Block);
      return { ...d, blocks: next };
    });
    setAddOpen(null);
  }

  async function save(status?: ApiPost["status"]) {
    if (!draft || saving) return;
    setSaving(true);
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
      setSaved(e instanceof Error ? e.message : "Save failed");
      setTimeout(() => setSaved(null), 2600);
    } finally {
      setSaving(false);
    }
  }

  const topicName = state.topics.find((t) => t.slug === draft.category)?.name ?? draft.category;

  return (
    <div className={styles.fullWidth}>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <Link href="/admin/posts" className={styles.back} aria-label="Back to posts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className={styles.tabs} role="tablist" aria-label="Editor view">
            {(["write", "preview", "settings"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? styles.tabActive : styles.tab}
                onClick={() => setTab(t)}
              >
                {t === "write" ? "Write" : t === "preview" ? "Preview" : "Settings"}
              </button>
            ))}
          </div>
          <span className={styles.autosave}>
            {saved ? (
              <span className={styles.savedMsg}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
                {saved}
              </span>
            ) : (
              saving ? "Saving…" : "Autosave off — press Save"
            )}
          </span>
          <StatusChip status={draft.status} tone={statusTone(draft.status)} />
          <Button variant="outlined" onClick={() => save("draft")}>Save draft</Button>
          <Button onClick={() => save("published")}>Publish</Button>
          {existing ? (
            <Button
              variant="text"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Delete “${draft.title || "this post"}”? This cannot be undone.`)) return;
                try {
                  await api.del(`/api/admin/posts/${draft.id}?hard=1`);
                  router.push("/admin/posts");
                  router.refresh();
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>

        {tab === "settings" ? (
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
        ) : (
          <div className={styles.doc}>
            <input
              className={styles.title}
              value={draft.title}
              placeholder="Post title"
              onChange={(e) => {
                patch({ title: e.target.value });
                if (!slugTouched.current) patch({ slug: slugifyTitle(e.target.value) });
              }}
            />
            <textarea
              className={styles.desc}
              value={draft.summary}
              placeholder="Standfirst — one sentence that appears in cards and search"
              rows={2}
              onChange={(e) => patch({ summary: e.target.value })}
            />
            <p className={styles.byline}>
              {authorName} · {topicName} ·{" "}
              {words} words · ~{Math.max(1, Math.round(words / 220))} min read
            </p>

            {draft.cover ? (
              <div className={styles.coverPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.cover} alt={draft.coverAlt} />
                <button type="button" className={styles.removeCover} onClick={() => patch({ cover: null })}>
                  Remove cover
                </button>
              </div>
            ) : (
              <label className={styles.addCover} style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const r = await api.upload(f);
                      patch({ cover: r.src, coverAlt: draft.coverAlt || "Cover image" });
                      uploadsC.reload();
                    } catch (err) {
                      window.alert(err instanceof Error ? err.message : "Upload failed");
                    }
                    e.target.value = "";
                  }}
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                </svg>
                Upload a cover image
              </label>
            )}

            {tab === "preview" ? (
              <Preview draft={draft} />
            ) : (
              <div className={styles.blocks}>
                {draft.blocks.map((block, i) => (
                  <div key={(block as { __k?: string }).__k ?? `b${i}`} className={styles.block}>
                    <div className={styles.blockGutter}>
                      <button type="button" className={styles.gutterBtn} onClick={() => moveBlock(i, -1)} aria-label="Move block up">↑</button>
                      <button type="button" className={styles.gutterBtn} onClick={() => moveBlock(i, 1)} aria-label="Move block down">↓</button>
                      <button
                        type="button"
                        className={styles.gutterBtn}
                        onClick={() => setAddOpen(addOpen === i ? null : i)}
                        aria-label="Insert block after"
                      >
                        +
                      </button>
                      <button type="button" className={styles.gutterBtn} onClick={() => removeBlock(i)} aria-label="Delete block">×</button>
                    </div>
                    <BlockEditor block={block} onChange={(b) => patchBlock(i, b)} imageOptions={imageOptions} postOptions={postsC.items.filter((p) => p.slug !== draft?.slug).map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, cover: p.cover_url ?? "" }))} />
                    {addOpen === i ? (
                      <div className={styles.blockMenu}>
                        {BLOCK_TYPES.map((t) => (
                          <button key={t.type} type="button" onClick={() => insertBlock(i, t.type)}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addBlock}
                  onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, { ...newBlock("p"), __k: Math.random().toString(36).slice(2) } as unknown as Block] })}
                >
                  + Add block
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
  const [uploading, setUploading] = useState(false);
  return (
    <div className={styles.doc}>
      <h2 className={styles.settingsHead}>Post settings</h2>

      <div className={styles.settingsForm}>
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
          <span>Date</span>
          <input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
        </label>
        <label className={styles.formField}>
          <span>Author</span>
          <input value={authorName} readOnly />
        </label>
        <label className={styles.formField}>
          <span>Topic</span>
          <select value={draft.category} onChange={(e) => patch({ category: e.target.value })}>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.formField}>
          <span>URL slug</span>
          <input
            value={draft.slug}
            onChange={(e) => {
              slugTouched.current = true;
              patch({ slug: slugifyTitle(e.target.value) });
            }}
          />
        </label>
        <label className={styles.formField}>
          <span>Reading time (auto)</span>
          <input value={`${draft.readingMinutes} min`} readOnly />
        </label>
      </div>

      <div className={styles.featureBox}>
        <label className={styles.toggleRow}>
          <input type="checkbox" checked={draft.featured} onChange={(e) => patch({ featured: e.target.checked })} />
          <span>
            <strong>Feature on the homepage</strong>
            <em>The lead story in the big hero card at bishnuneupane13.com.np — only one post is featured at a time; featuring this one quietly un-features the rest.</em>
          </span>
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>Tags</span>
          <TagEditor tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.formField}>
          <span>Cover image</span>
          <div className={styles.coverGrid}>
            {coverOptions.map(({ src }) => (
              <button
                key={src}
                type="button"
                className={draft.cover === src ? styles.coverActive : styles.coverItem}
                onClick={() => patch({ cover: src, coverAlt: draft.coverAlt || "Cover image" })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </button>
            ))}
            <label className={styles.coverUpload}>
              {uploading ? "Uploading…" : "+ Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    const src = await onUploadCover(f);
                    patch({ cover: src, coverAlt: draft.coverAlt || "Cover image" });
                  } catch (err) {
                    window.alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
          {draft.cover ? (
            <button type="button" className={styles.linkDanger} onClick={() => patch({ cover: null })}>Remove cover</button>
          ) : null}
          <input placeholder="Alt text for the cover" value={draft.coverAlt} onChange={(e) => patch({ coverAlt: e.target.value })} />
          {draft.cover ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <input
                type="range"
                min={200}
                max={900}
                step={20}
                aria-label="Cover height in pixels"
                value={draft.coverHeight ?? 560}
                onChange={(e) => patch({ coverHeight: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
              <strong style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, minWidth: 52 }}>{draft.coverHeight ?? 560}px</strong>
              {draft.coverHeight ? (
                <button type="button" onClick={() => patch({ coverHeight: null })} style={{ border: "none", background: "transparent", color: "#1a73e8", fontSize: 12, cursor: "pointer" }}>
                  auto
                </button>
              ) : null}
            </span>
          ) : null}
        </label>
      </div>
      <p className={styles.settingsNote}>
        Structured data and the RSS entry are generated from these fields when the post is published.
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
  switch (block.type) {
    case "h2":
    case "h3":
      return (
        <input
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
      return (
        <div className={styles.imageWrap}>
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.alt} className={styles.imagePreview} />
          ) : null}
          <select value={imageOptions.some((g) => g.src === block.src) || !block.src ? block.src : ""} onChange={(e) => onChange({ ...block, src: e.target.value })}>
            <option value="">Choose an image…</option>
            {imageOptions.map((g) => (
              <option key={g.src} value={g.src}>{g.label}</option>
            ))}
          </select>
          <input value={block.src} placeholder="…or paste any image URL" onChange={(e) => onChange({ ...block, src: e.target.value.trim() })} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#5f6368" }}>Size</span>
            {(["full", "wide", "medium", "small"] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onChange({ ...block, width: sz })}
                style={{
                  fontSize: 12, padding: "4px 10px", borderRadius: 999, textTransform: "capitalize",
                  border: (block.width ?? "full") === sz ? "1px solid #1a73e8" : "1px solid #dadce0",
                  background: (block.width ?? "full") === sz ? "#e8f0fe" : "transparent",
                  color: (block.width ?? "full") === sz ? "#1967d2" : "#3c4043", cursor: "pointer",
                }}
              >
                {sz}
              </button>
            ))}
          </div>
          <label className={styles.uploadBtn}>
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const { src } = await api.upload(file);
                  onChange({ ...block, src });
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Upload failed");
                }
                e.target.value = "";
              }}
            />
          </label>
          <input value={block.alt} placeholder="Alt text (required)" onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <input value={block.caption ?? ""} placeholder="Caption" onChange={(e) => onChange({ ...block, caption: e.target.value })} />
        </div>
      );
    case "row": {
      const patchItems = (items: { src: string; alt: string }[]) => onChange({ ...block, items });
      const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= block.items.length) return;
        const next = [...block.items];
        [next[i], next[j]] = [next[j], next[i]];
        patchItems(next);
      };
      const addFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        for (const file of Array.from(files)) {
          try {
            const { src } = await api.upload(file);
            patchItems([...block.items, { src, alt: file.name.replace(/\.[^.]+$/, "") }]);
          } catch (err) {
            toast(err instanceof Error ? err.message : `Could not upload ${file.name}`);
          }
        }
      };
      return (
        <div className={styles.rowEditor}>
          <div className={styles.rowGridHead}>
            <span>{block.items.length} item{block.items.length === 1 ? "" : "s"} — add as many photos or clips as you like</span>
          </div>
          <ul className={styles.rowList}>
            {block.items.map((it, i) => (
              <li key={i} className={styles.rowItem}>
                <span className={styles.rowThumb}>
                  {it.src ? (
                    /\.mp4|\.webm/i.test(it.src) ? (
                      <video src={it.src} muted playsInline preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.src} alt="" loading="lazy" />
                    )
                  ) : (
                    <span className={styles.rowThumbEmpty}>?</span>
                  )}
                </span>
                <input
                  className={styles.rowAlt}
                  value={it.alt}
                  placeholder={`Caption / alt for #${i + 1}`}
                  onChange={(e) => patchItems(block.items.map((x, idx) => (idx === i ? { ...x, alt: e.target.value } : x)))}
                />
                <select
                  aria-label={`Size for item ${i + 1}`}
                  value={typeof it.size === "string" ? it.size : "auto"}
                  onChange={(e) => patchItems(block.items.map((x, idx) => (idx === i ? { ...x, size: e.target.value } : x)))}
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
                        patchItems(block.items.map((x, idx) => (idx === i ? { ...x, src } : x)));
                      } catch (err) {
                        toast(err instanceof Error ? err.message : "Upload failed");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button type="button" className={styles.rowRemove} onClick={() => patchItems(block.items.filter((_, idx) => idx !== i))} aria-label={`Remove item ${i + 1}`}>×</button>
              </li>
            ))}
          </ul>
          <div className={styles.rowFoot}>
            <label className={`${styles.uploadBtn} ${styles.rowAddBtn}`}>
              + Add photos or videos
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                hidden
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <button type="button" className={styles.linkBtn} onClick={() => patchItems([...block.items, { src: "", alt: "" }])}>+ Blank slot</button>
          </div>
          <input value={block.caption ?? ""} placeholder="Caption (optional)" onChange={(e) => onChange({ ...block, caption: e.target.value })} />
        </div>
      );
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
          <span style={{ fontSize: 12, color: "#5f6368" }}>Inserts a “Read next” card linking to one of your posts.</span>
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

function Preview({ draft }: { draft: EditorDraft }) {
  return (
    <div className={styles.preview}>
      <p className={styles.previewKicker}>Preview — rendered exactly like the live site</p>
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
