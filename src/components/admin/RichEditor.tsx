"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./RichEditor.module.scss";

const TOOLS: { cmd: string; tag: string; label: string; title: string; html?: string }[] = [
  { cmd: "bold", tag: "strong", label: "B", title: "Bold (Ctrl+B)" },
  { cmd: "italic", tag: "em", label: "I", title: "Italic (Ctrl+I)" },
  { cmd: "underline", tag: "u", label: "U", title: "Underline (Ctrl+U)" },
  { cmd: "strikeThrough", tag: "s", label: "S", title: "Strikethrough" },
  { cmd: "mark", tag: "mark", label: "Highlight", title: "Highlight selection" },
  { cmd: "link", tag: "a", label: "Link", title: "Add link" },
  { cmd: "removeFormat", tag: "", label: "Clear", title: "Clear formatting" },
];

export function RichEditor({
  value,
  onChange,
  placeholder = "Write something…",
  minHeight = 74,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmit = useRef(value);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Sync external value without stealing focus/caret mid-typing.
  useEffect(() => {
    const el = ref.current;
    if (el && value !== lastEmit.current) {
      el.innerHTML = value || "";
      lastEmit.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    lastEmit.current = el.innerHTML;
    onChange(el.innerHTML === "<br>" ? "" : el.innerHTML);
  }, [onChange]);

  const refreshActive = useCallback(() => {
    const next: Record<string, boolean> = {};
    try {
      for (const t of TOOLS) {
        if (t.cmd === "link") {
          next.link = !!document.queryCommandValue("link");
        } else if (t.tag) {
          next[t.cmd] = document.queryCommandState(t.cmd);
        }
      }
    } catch {
      /* selection not in editor */
    }
    setActive(next);
  }, []);

  function run(cmd: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (cmd === "mark") {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      const mark = document.createElement("mark");
      try {
        range.surroundContents(mark);
      } catch {
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
      }
      sel.removeAllRanges();
    } else if (cmd === "link") {
      const sel = window.getSelection();
      const currentHref = (() => {
        try { return document.queryCommandValue("link") || ""; } catch { return ""; }
      })();
      const url = window.prompt("Link URL (https://… or /blog/slug). Leave empty to remove.", currentHref);
      if (url === null) return;
      if (url.trim() === "") {
        document.execCommand("unlink");
      } else if (sel && sel.isCollapsed && currentHref) {
        // Caret inside an existing link with no selection — replace its href.
        const node = sel.anchorNode;
        const a = node instanceof Element ? node.closest("a") : node?.parentElement?.closest("a");
        if (a) a.setAttribute("href", url.trim());
      } else {
        document.execCommand("createLink", false, url.trim());
      }
    } else {
      document.execCommand(cmd);
    }
    refreshActive();
    emit();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd)}
            className={`${styles.tool} ${active[t.cmd] ? styles.toolOn : ""}`}
            aria-pressed={Boolean(active[t.cmd])}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onFocus={refreshActive}
        dangerouslySetInnerHTML={{ __html: value || "" }}
      />
    </div>
  );
}
