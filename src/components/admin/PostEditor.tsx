"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/components/admin/api";
import { useToast } from "@/components/admin/Feedback";
import { Button } from "@/components/admin/Button";
import { useApiCollection } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/Feedback";
import { EmptyState, StatusChip, statusTone, Switch, Segmented } from "@/components/admin/kit";
import { formatDate } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { useBlockDrag } from "./BlockCanvas";
import { BlockInserter, InsertRail, BLOCKS } from "./BlockInserter";
import blockDragStyles from "./BlockCanvas.module.scss";
import styles from "./PostEditor.module.scss";

export interface Block {
  type: string;
  data?: any;
}

export interface EditorState {
  title: string;
  slug: string;
  summary: string;
  status: "draft" | "review" | "scheduled" | "published";
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

function generateSlug(title: string): string {
  return slugify(title).slice(0, 80) || `post-${Date.now()}`;
}

export function PostEditor({ postId }: { postId: string | "new" }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<EditorState>({
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
    blocks: [{ type: "paragraph", data: { text: "" } }],
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [palette, setPalette] = useState<{ index: number; query: string; active: number } | null>(null);

  // Load existing post or start new
  useEffect(() => {
    async function load() {
      if (postId === "new") {
        setState({
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
          blocks: [{ type: "paragraph", data: { text: "" } }],
        });
        return;
      }
      
      setIsLoading(true);
      try {
        const res = await api.get<{ post: EditorState }>(`/api/admin/posts/${postId}`);
        setState(res.post);
        // Ensure slug is generated if missing
        if (!res.post.slug) {
          setState({ ...res.post, slug: generateSlug(res.post.title) });
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to load post", "error");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [postId]);

  // Auto-save logic
  useEffect(() => {
    if (isLoading || saving) return;
    const timeout = setTimeout(() => {
      setSaved("Auto-saved");
      setTimeout(() => setSaved(null), 1800);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [state.title, state.summary, state.blocks]);

  // Words count
  const words = state.blocks.reduce((acc: number, block: Block) => {
    if (block.type === "paragraph" && block.data?.text) {
      return acc + block.data.text.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === "code" && block.data?.code) {
      return acc + block.data.code.split(/\s+/).filter(Boolean).length;
    }
    if (block.type === "list" && block.data?.items) {
      return acc + block.data.items.join(" ").split(/\s+/).filter(Boolean).length;
    }
    return acc;
  }, 0);

  const readingTime = Math.max(1, Math.round(words / 220));

  function updateBlock(i: number, block: Block) {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map((b, idx) => idx === i ? block : b),
    }));
  }

  function addBlock(i: number, blockType: string) {
    const newBlock: Block = {
      type: blockType,
      data: {},
    };
    setState(prev => {
      const newBlocks = [...prev.blocks];
      newBlocks.splice(i + 1, 0, newBlock);
      return { ...prev, blocks: newBlocks };
    });
    setSelectedBlock(newBlock);
  }

  /* Insert a block at `index` (replacing the slash-command paragraph) or after
     it when the current block already has content. */
  function insertBlockAt(index: number, blockType: string) {
    setState(prev => {
      const current = prev.blocks[index];
      const blank = current?.type === "paragraph" && !(current.data?.text || "").trim();
      const fresh: Block = { type: blockType, data: {} };
      const next = [...prev.blocks];
      if (blank) next.splice(index, 1, fresh);
      else next.splice(index + 1, 0, fresh);
      // Keep a paragraph after non-text blocks so typing can continue.
      if (blockType !== "paragraph" && !blank) next.splice(index + 2, 0, { type: "paragraph", data: { text: "" } });
      return { ...prev, blocks: next };
    });
  }

  function selectBlock(block: Block) {    setSelectedBlock(block);
    // Scroll block into view
    const element = document.querySelector(`.block-container[data-id="${block.data?.id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function removeBlock(i: number) {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.filter((_, idx) => idx !== i),
    }));
  }

  /* `to` is the index (in the unfiltered list) of the block the drop line sits
     BEFORE. Removing the dragged block shifts every later index down by one,
     so downward drags insert one slot earlier. */
  function moveBlock(from: number, to: number) {
    if (from === to) return;
    setState(prev => {
      if (from < 0 || from >= prev.blocks.length) return prev;
      const moved = prev.blocks[from];
      const rest = prev.blocks.filter((_, i) => i !== from);
      const at = Math.max(0, Math.min(from < to ? to - 1 : to, rest.length));
      return { ...prev, blocks: [...rest.slice(0, at), moved, ...rest.slice(at)] };
    });
  }

  const blockDrag = useBlockDrag({
    items: state.blocks,
    onReorder: moveBlock,
  });

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...state,
        blocks: state.blocks.map((b: any) => ({
          type: b.type,
          ...b.data,
        })),
      };
      
      await api.patch(`/api/admin/posts/${postId === "new" ? "temp" : postId}`, payload);
      setSaving(false);
      setSaved("saved");
      setTimeout(() => setSaved(null), 1800);
      router.refresh();
    } catch (e) {
      setSaving(false);
      toast(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  async function publish() {
    setSaving(true);
    try {
      await api.patch(`/api/admin/posts/${postId}`, {
        ...state,
        status: "published",
        blocks: state.blocks.map((b: any) => ({
          type: b.type,
          ...b.data,
        })),
      });
      setSaved("published");
      setTimeout(() => setSaved(null), 1800);
      router.push("/admin/posts");
      router.refresh();
    } catch (e) {
      setSaving(false);
      toast(e instanceof Error ? e.message : "Publish failed", "error");
    }
  }

  // Block type handlers
  const blockHandlers: Record<string, (block: Block) => Block> = {
    paragraph: (b) => ({ type: "paragraph", data: { text: b.data?.text || "" } }),
    heading1: (b) => ({ type: "heading1", data: { text: b.data?.text || "Heading" } }),
    heading2: (b) => ({ type: "heading2", data: { text: b.data?.text || "Heading" } }),
    heading3: (b) => ({ type: "heading3", data: { text: b.data?.text || "Heading" } }),
    image: (b) => ({ type: "image", data: { src: b.data?.src || "", alt: b.data?.alt || "" } }),
    video: (b) => ({ type: "video", data: { url: b.data?.url || "", caption: b.data?.caption || "" } }),
    code: (b) => ({ type: "code", data: { code: b.data?.code || "", lang: b.data?.lang || "text" } }),
    quote: (b) => ({ type: "quote", data: { text: b.data?.text || "", cite: b.data?.cite || "" } }),
    list: (b) => ({ type: "list", data: { ordered: b.data?.ordered || false, items: b.data?.items || [] } }),
    table: (b) => ({ type: "table", data: { head: b.data?.head || [], rows: b.data?.rows || [] } }),
    divider: (b) => ({ type: "divider", data: {} }),
    chart: (b) => ({ type: "chart", data: { kind: "column", data: [] } }),
    row: (b) => ({ type: "row", data: { items: b.data?.items || [], caption: b.data?.caption || "" } }),
    cta: (b) => ({ type: "cta", data: { label: b.data?.label || "Learn more", href: b.data?.href || "", style: b.data?.style || "primary", note: b.data?.note || "" } }),
    footnote: (b) => ({ type: "footnote", data: { text: b.data?.text || "" } }),
    jumplinks: (b) => ({ type: "jumplinks", data: { title: b.data?.title || "In this article" } }),
  };

  // Render block component
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case "paragraph": {
        const idx = state.blocks.findIndex((b: any) => b.data?.id === block.data?.id);
        const text: string = block.data?.text || "";
        const slashOpen = palette?.index === idx;
        return (
          <div className={`${styles.block} ${styles.blockText} ${slashOpen ? styles.blockSlash : ""}`} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <textarea
              className={styles.input}
              value={text}
              onChange={(e) => {
                const value = e.target.value;
                updateBlock(idx, { type: "paragraph", data: { text: value } });
                // "/" at the very start of an empty paragraph opens the palette.
                if (value === "/") setPalette({ index: idx, query: "", active: 0 });
                else if (slashOpen) {
                  if (value.startsWith("/")) setPalette({ index: idx, query: value.slice(1), active: 0 });
                  else setPalette(null);
                }
              }}
              onKeyDown={(e) => {
                if (!slashOpen) return;
                if (e.key === "Escape") {
                  e.preventDefault();
                  setPalette(null);
                  return;
                }
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const dir = e.key === "ArrowDown" ? 1 : -1;
                  setPalette((p) => (p ? { ...p, active: Math.max(0, p.active + dir) } : p));
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  const q = (palette?.query || "").toLowerCase();
                  const list = BLOCKS.filter(
                    (b) => !q || `${b.label} ${b.hint} ${b.keywords ?? ""} ${b.type}`.toLowerCase().includes(q),
                  );
                  const pick = list[palette?.active ?? 0];
                  if (pick) insertBlockAt(idx, pick.type);
                  setPalette(null);
                }
              }}
              placeholder="Type “/” for commands, or just start writing…"
              spellCheck="true"
              rows={Math.max(3, Math.ceil(text.length / 90))}
            />
            {slashOpen ? (
              <BlockInserter
                query={palette?.query || ""}
                activeIndex={palette?.active ?? 0}
                onActiveChange={(a) => setPalette((p) => (p ? { ...p, active: a } : p))}
                onPick={(type) => {
                  insertBlockAt(idx, type);
                  setPalette(null);
                }}
              />
            ) : null}
          </div>
        );
      }
      case "heading1": {
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <h1 className={styles.heading} onClick={() => selectBlock(block)}>{block.data?.text || "Heading"}</h1>
            <textarea
              className={styles.input}
              value={block.data?.text || ""}
              onChange={(e) => updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                type: "heading1",
                data: { text: e.target.value },
              })}
              placeholder="Add heading..."
            />
          </div>
        );
      }
      case "image": {
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <div className={styles.imagePlaceholder} onClick={() => selectBlock(block)}>
              {block.data?.src ? (
                <img
                  src={block.data.src}
                  alt={block.data.alt || ""}
                  className={styles.imagePreview}
                />
              ) : (
                <div className={styles.imageAdd} onClick={() => selectBlock(block)}>
                  + Add Image
                </div>
              )}
            </div>
            <input
              className={styles.input}
              value={block.data?.alt || ""}
              onChange={(e) => updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                type: "image",
                data: { ...block.data, alt: e.target.value },
              })}
              placeholder="Alt text"
            />
          </div>
        );
      }
      case "code": {
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <div className={styles.codeHeader}>
              <span className={styles.codeLang}>{block.data?.lang || "text"}</span>
              <button className={styles.codeClose} onClick={() => removeBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id))}>×</button>
            </div>
            <textarea
              className={styles.codeInput}
              value={block.data?.code || ""}
              onChange={(e) => updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                type: "code",
                data: { code: e.target.value, lang: block.data?.lang || "text" },
              })}
              placeholder="Paste code..."
              spellCheck="false"
            />
          </div>
        );
      }
      case "list": {
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <div className={styles.listControl}>
              <label>
                <input
                  type="checkbox"
                  checked={block.data?.ordered || false}
                  onChange={(e) => updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                    type: "list",
                    data: { ...block.data, ordered: e.target.checked },
                  })}
                />
                Ordered
              </label>
              <button className={styles.listAdd} onClick={() => addBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), "list")}>+</button>
              <button className={styles.listRemove} onClick={() => removeBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id))}>×</button>
            </div>
            {block.data?.items?.map((item: string, i: number) => (
              <div key={i} className={styles.listItem}>
                <input
                  className={styles.listInput}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.data.items];
                    newItems[i] = e.target.value;
                    updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                      type: "list",
                      data: { ...block.data, items: newItems },
                    });
                  }}
                />
                <button className={styles.listRemove} onClick={() => {
                  const newItems = [...block.data.items];
                  newItems.splice(i, 1);
                  updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                    type: "list",
                    data: { ...block.data, items: newItems },
                  });
                }}>×</button>
              </div>
            ))}
          </div>
        );
      }
      case "divider": {
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <hr className={styles.divider} />
          </div>
        );
      }
      case "cta": {
        const idx = state.blocks.findIndex((b: any) => b.data?.id === block.data?.id);
        return (
          <div className={`${styles.block} ${styles.blockCard}`} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <span className={styles.blockTag}>Call to action</span>
            <div className={styles.fieldRow}>
              <input
                className={styles.input}
                value={block.data?.label || ""}
                onChange={(e) => updateBlock(idx, { type: "cta", data: { ...block.data, label: e.target.value } })}
                placeholder="Button label"
              />
              <select
                className={styles.select}
                value={block.data?.style || "primary"}
                onChange={(e) => updateBlock(idx, { type: "cta", data: { ...block.data, style: e.target.value } })}
              >
                <option value="primary">Filled</option>
                <option value="outline">Outline</option>
              </select>
            </div>
            <input
              className={styles.input}
              value={block.data?.href || ""}
              onChange={(e) => updateBlock(idx, { type: "cta", data: { ...block.data, href: e.target.value } })}
              placeholder="https://example.com or /blog/some-post"
            />
            <input
              className={styles.input}
              value={block.data?.note || ""}
              onChange={(e) => updateBlock(idx, { type: "cta", data: { ...block.data, note: e.target.value } })}
              placeholder="Small note beside the button (optional)"
            />
          </div>
        );
      }
      case "footnote": {
        const idx = state.blocks.findIndex((b: any) => b.data?.id === block.data?.id);
        return (
          <div className={`${styles.block} ${styles.blockCard}`} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <span className={styles.blockTag}>Footnote</span>
            <textarea
              className={styles.input}
              rows={2}
              value={block.data?.text || ""}
              onChange={(e) => updateBlock(idx, { type: "footnote", data: { text: e.target.value } })}
              placeholder="Source, clarification, or citation…"
            />
          </div>
        );
      }
      case "jumplinks": {
        const idx = state.blocks.findIndex((b: any) => b.data?.id === block.data?.id);
        return (
          <div className={`${styles.block} ${styles.blockCard}`} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <span className={styles.blockTag}>Contents</span>
            <input
              className={styles.input}
              value={block.data?.title || ""}
              onChange={(e) => updateBlock(idx, { type: "jumplinks", data: { title: e.target.value } })}
              placeholder="In this article"
            />
            <p className={styles.blockNote}>
              Links are generated automatically from your Heading 2 and Heading 3 blocks.
            </p>
          </div>
        );
      }
      case "row": {
        const idx = state.blocks.findIndex((b: any) => b.data?.id === block.data?.id);
        const items: { src: string; alt: string }[] = block.data?.items || [];
        return (
          <div className={`${styles.block} ${styles.blockCard}`} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <span className={styles.blockTag}>Media carousel · {items.length} item{items.length === 1 ? "" : "s"}</span>
            <div className={styles.rowStrip}>
              {items.map((it, n) => (
                <div key={n} className={styles.rowStripItem}>
                  {/\.(mp4|webm)(\?|$)/i.test(it.src) ? (
                    <video src={it.src} muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.src} alt={it.alt} />
                  )}
                  <button
                    type="button"
                    className={styles.rowStripRemove}
                    onClick={() =>
                      updateBlock(idx, { type: "row", data: { ...block.data, items: items.filter((_, k) => k !== n) } })
                    }
                    aria-label={`Remove item ${n + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className={styles.rowStripAdd}>
                +
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const { src } = await api.upload(file);
                      updateBlock(idx, { type: "row", data: { ...block.data, items: [...items, { src, alt: "" }] } });
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Upload failed", "error");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <input
              className={styles.input}
              value={block.data?.caption || ""}
              onChange={(e) => updateBlock(idx, { type: "row", data: { ...block.data, caption: e.target.value } })}
              placeholder="Caption shown under each card"
            />
          </div>
        );
      }
      default:
        return (
          <div className={styles.block} key={block.data?.id} tabIndex={-1} onFocus={() => selectBlock(block)}>
            <textarea
              className={styles.input}
              value={block.data?.text || ""}
              onChange={(e) => updateBlock(state.blocks.findIndex((b: any) => b.data?.id === block.data?.id), {
                type: "paragraph",
                data: { text: e.target.value },
              })}
              placeholder="Write something..."
            />
          </div>
        );
    }
  };

  return (
    <div className={styles.editor}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Blog Post Editor</h1>
          <p className={styles.headerSubtitle}>Write and format your content below</p>
        </div>
        <div className={styles.headerRight}>
          <Button variant="outlined" onClick={() => router.push("/admin/posts")}>
            Posts
          </Button>
          <Button variant="outlined" tone="danger" onClick={() => {
            if (window.confirm("Delete this post? This cannot be undone.")) {
              api.del(`/api/admin/posts/${postId}?hard=1`).then(() => {
                router.push("/admin/posts");
                router.refresh();
              });
            }
          }}>
            Delete
          </Button>
          <Button variant="outlined" onClick={publish} disabled={saving}>
            {saving ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </header>

      {/* Main editor area */}
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.blocksToolbar}>
            <Button variant="outlined" onClick={() => addBlock(state.blocks.length, "paragraph")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v8l2-6L12 3zM3 15l9 3 9-3v-6l-9-3-9 3v6z" />
              </svg>
              Para
            </Button>
            <Button variant="outlined" onClick={() => addBlock(state.blocks.length, "image")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="17" height="17" rx="2" />
                <path d="M15 3h6v6h-6V3zM3 15l9 3 9-3v-6l-9-3-9 3v6z" />
              </svg>
              Image
            </Button>
            <Button variant="outlined" onClick={() => addBlock(state.blocks.length, "code")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              Code
            </Button>
            <Button variant="outlined" onClick={() => addBlock(state.blocks.length, "heading1")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20hM12 2a10 10 0 1 0 10-10" />
              </svg>
              Heading
            </Button>
            <Button variant="outlined" onClick={() => addBlock(state.blocks.length, "divider")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20hM12 4a8 8 0 1 0 0 16" />
              </svg>
              Divider
            </Button>
          </div>
          <div className={styles.actions}>
            <span className={styles.wordsCount}>
              {words} words · ~{readingTime} min read
            </span>
            <Button variant="outlined" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </div>

        {/* Editor content */}
        <div className={styles.editorContent} ref={blockDrag.listRef}>
          {state.blocks.map((block, i) => (
            <div
              key={block.data?.id || i}
              data-block-index={i}
              className={`${styles.blockContainer} ${blockDragStyles.blockRow} ${
                blockDrag.dragging?.from === i ? blockDragStyles.dragSource : ""
              }`}
              tabIndex={-1}
              onFocus={() => selectBlock(block)}
            >
              <button
                type="button"
                className={blockDragStyles.handle}
                onPointerDown={(e) => blockDrag.start(i, e)}
                aria-label={`Reorder block ${i + 1}`}
                title="Hold and drag to reorder"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                </svg>
              </button>
              {blockDrag.dragging && blockDrag.dragging.to === i && blockDrag.dragging.from !== i ? (
                <div className={blockDragStyles.dropLine} aria-hidden="true" />
              ) : null}
              {renderBlock(block)}
              <div className={styles.blockActions}>
                <button className={styles.moveUp} onClick={() => moveBlock(i, i - 1)} title="Move up">▲</button>
                <button className={styles.moveDown} onClick={() => moveBlock(i, i + 1)} title="Move down">▼</button>
                <button className={styles.remove} onClick={() => removeBlock(i)} title="Remove">×</button>
              </div>
            </div>
          ))}
          {state.blocks.length === 0 ? (
            <EmptyState
              title="Start writing..."
              body="Add your first block above - paragraph, image, code, or heading"
              action="Add Block"
              href="javascript:void(0)"
            />
          ) : null}
        </div>

        {/* Block insert rail */}
        <InsertRail onPick={(type) => insertBlockAt(state.blocks.length - 1, type)} />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Post Settings</h2>
            <button className={styles.sidebarClose} onClick={() => setShowSidebar(false)}>&times;</button>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Title</h3>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={state.title}
                onChange={(e) => setState(prev => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }))}
                placeholder="Post title"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Summary</h3>
            <textarea
              rows={3}
              value={state.summary}
              onChange={(e) => setState(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="One sentence that appears in cards and search results"
              className={styles.input}
            />
          </div>

          <div className={styles.sidebarSection}>
            <h3>Category</h3>
            <select
              value={state.category}
              onChange={(e) => setState(prev => ({ ...prev, category: e.target.value }))}
              className={styles.select}
            >
              <option value="">Select category</option>
              <option value="technology">Technology</option>
              <option value="science">Science</option>
              <option value="culture">Culture</option>
              <option value="life">Life</option>
            </select>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Tags</h3>
            <div className={styles.tagsInput}>
              <input
                type="text"
                placeholder="Add tags..."
                value={state.tags.join(", ")}
                onChange={(e) => setState(prev => ({ ...prev, tags: e.target.value.split(",").filter((t: string) => t.trim()).map((t: string) => t.trim()) }))}
                className={styles.tagsInput}
              />
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Featured</h3>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={state.featured}
                onChange={(e) => setState(prev => ({ ...prev, featured: e.target.checked }))}
                className={styles.checkboxInput}
              />
              <span>Feature on homepage</span>
            </label>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Cover Image</h3>
            {state.cover ? (
              <div className={styles.coverPreview}>
                <img src={state.cover} alt={state.coverAlt} className={styles.coverImg} />
                <button className={styles.coverRemove} onClick={() => setState(prev => ({ ...prev, cover: null, coverAlt: "" }))}>Remove</button>
              </div>
            ) : (
              <button className={styles.coverUpload} onClick={() => {/* file upload */}}>
                + Upload cover
              </button>
            )}
          </div>

          <div className={styles.sidebarSection}>
            <h3>Reading Time</h3>
            <p>{readingTime} min read</p>
            <small>Based on {words} words at 220 wpm</small>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Status</h3>
            <Segmented<"draft" | "review" | "scheduled" | "published">
              label="Status"
              value={state.status}
              onChange={(e) => setState(prev => ({ ...prev, status: e }))}
              options={[
                { value: "draft", label: "Draft", count: 0 },
                { value: "review", label: "In Review", count: 0 },
                { value: "scheduled", label: "Scheduled", count: 0 },
                { value: "published", label: "Published", count: 0 },
              ]}
            />
          </div>

          <div className={styles.sidebarActions}>
            <Button variant="outlined" onClick={save}>Save Draft</Button>
            <Button variant="outlined" onClick={publish} disabled={saving}>
              {saving ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}