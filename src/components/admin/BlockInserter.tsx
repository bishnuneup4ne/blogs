"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BlockInserter.module.scss";

export interface BlockDef {
  type: string;
  label: string;
  hint: string;
  group: "Text" | "Media" | "Structure" | "Data";
  keywords?: string;
  icon: React.ReactNode;
}

const ic = (d: string, fill = false) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
    fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const BLOCKS: BlockDef[] = [
  { type: "paragraph", label: "Text", hint: "Just start writing with plain text", group: "Text", keywords: "p body para",
    icon: ic("M4 7h16M4 12h16M4 17h10") },
  { type: "heading1", label: "Heading 1", hint: "Big section heading", group: "Text", keywords: "h1 title",
    icon: ic("M5 5v14M15 5v14M5 12h10") },
  { type: "heading2", label: "Heading 2", hint: "Medium section heading", group: "Text", keywords: "h2 subtitle",
    icon: ic("M5 7v10M13 7v10M5 12h8") },
  { type: "heading3", label: "Heading 3", hint: "Small section heading", group: "Text", keywords: "h3 minor",
    icon: ic("M5 9v6M11 9v6M5 12h6") },
  { type: "quote", label: "Quote", hint: "Capture a quote or pull-out", group: "Text", keywords: "blockquote cite",
    icon: ic('M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4') },
  { type: "list", label: "List", hint: "Bulleted or numbered list", group: "Text", keywords: "bullets ordered",
    icon: ic("M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01") },

  { type: "image", label: "Image", hint: "Upload or link a photo", group: "Media", keywords: "photo picture",
    icon: ic("M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6") },
  { type: "row", label: "Media carousel", hint: "A swipeable strip of photos and clips", group: "Media", keywords: "gallery row slider carousel",
    icon: ic("M2 7h5v10H2zM9 7h6v10H9zM17 7h5v10h-5z") },
  { type: "video", label: "Video", hint: "Embed YouTube, Vimeo or an MP4", group: "Media", keywords: "youtube embed mp4",
    icon: ic("M3 6h18v12H3zM10 9.5l5 2.5-5 2.5z", true) },
  { type: "code", label: "Code", hint: "Syntax-highlighted code block", group: "Media", keywords: "snippet pre",
    icon: ic("M9 8l-4 4 4 4M15 8l4 4-4 4") },

  { type: "divider", label: "Divider", hint: "A horizontal rule", group: "Structure", keywords: "hr line separator",
    icon: ic("M3 12h18") },
  { type: "cta", label: "Call to action", hint: "A button that links somewhere", group: "Structure", keywords: "button link cta",
    icon: ic("M3 8h18v8H3z") },
  { type: "footnote", label: "Footnote", hint: "A numbered source note", group: "Structure", keywords: "reference source cite",
    icon: ic("M6 20V8a3 3 0 0 1 3-3h9M9 12h9") },

  { type: "table", label: "Table", hint: "Rows and columns of data", group: "Data", keywords: "grid rows columns",
    icon: ic("M3 5h18v14H3zM3 10h18M3 15h18M9 5v14") },
  { type: "chart", label: "Chart", hint: "Bar, line, pie and more", group: "Data", keywords: "graph data viz",
    icon: ic("M4 20V10M10 20V4M16 20v-7M22 20H2") },
];

/* Command palette shown after pressing "/" — filters as you type, commits with
   Enter or a click. */
export function BlockInserter({
  query,
  activeIndex,
  onPick,
  onActiveChange,
}: {
  query: string;
  activeIndex: number;
  onPick: (type: string) => void;
  onActiveChange: (i: number) => void;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCKS;
    return BLOCKS.filter((b) =>
      `${b.label} ${b.hint} ${b.keywords ?? ""} ${b.type}`.toLowerCase().includes(q),
    );
  }, [query]);

  if (results.length === 0) {
    return (
      <div className={styles.palette} role="listbox">
        <p className={styles.empty}>No blocks match “{query}”</p>
      </div>
    );
  }

  let lastGroup = "";

  return (
    <div className={styles.palette} role="listbox" aria-label="Insert block">
      {results.map((b, i) => {
        const showGroup = b.group !== lastGroup;
        lastGroup = b.group;
        return (
          <div key={b.type}>
            {showGroup ? <p className={styles.group}>{b.group}</p> : null}
            <button
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? `${styles.item} ${styles.itemActive}` : styles.item}
              onMouseEnter={() => onActiveChange(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(b.type);
              }}
            >
              <span className={styles.icon}>{b.icon}</span>
              <span className={styles.text}>
                <span className={styles.label}>{b.label}</span>
                <span className={styles.hint}>{b.hint}</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* Right-hand rail: every block, grouped, click to append. */
export function InsertRail({ onPick }: { onPick: (type: string) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? BLOCKS.filter((b) => `${b.label} ${b.hint} ${b.keywords ?? ""}`.toLowerCase().includes(q))
      : BLOCKS;
    const map = new Map<string, BlockDef[]>();
    for (const b of list) {
      if (!map.has(b.group)) map.set(b.group, []);
      map.get(b.group)!.push(b);
    }
    return [...map.entries()];
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside className={styles.rail} aria-label="Blocks">
      <div className={styles.railHead}>
        <h2 className={styles.railTitle}>Blocks</h2>
        <span className={styles.railKbd}>⌘K</span>
      </div>
      <div className={styles.searchWrap}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks…"
          aria-label="Search blocks"
        />
      </div>
      <div className={styles.railList}>
        {groups.map(([group, items]) => (
          <section key={group} className={styles.railGroup}>
            <p className={styles.group}>{group}</p>
            {items.map((b) => (
              <button key={b.type} type="button" className={styles.railItem} onClick={() => onPick(b.type)}>
                <span className={styles.icon}>{b.icon}</span>
                <span className={styles.text}>
                  <span className={styles.label}>{b.label}</span>
                  <span className={styles.hint}>{b.hint}</span>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
