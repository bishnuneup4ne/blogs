"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./RichEditor.module.scss";

const TOOLS: { cmd: string; tag: string; label: string; title: string }[] = [
  { cmd: "bold", tag: "strong", label: "B", title: "Bold (Ctrl+B)" },
  { cmd: "italic", tag: "em", label: "I", title: "Italic (Ctrl+I)" },
  { cmd: "underline", tag: "u", label: "U", title: "Underline (Ctrl+U)" },
  { cmd: "strikeThrough", tag: "s", label: "S", title: "Strikethrough" },
  { cmd: "foreColor", tag: "", label: "A", title: "Text colour" },
  { cmd: "hiliteColor", tag: "", label: "H", title: "Highlight colour" },
  { cmd: "link", tag: "a", label: "Link", title: "Add link" },
  { cmd: "removeFormat", tag: "", label: "Clear", title: "Clear formatting" },
];

const SWATCHES = ["#d93025", "#e37400", "#f9ab00", "#188038", "#1a73e8", "#9334e6", "#c5221f", "#202124"];

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
  const lastEmit = useRef<string | null>(null);
  const lastRange = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [colorPopup, setColorPopup] = useState<{ x: number; y: number; cmd: "foreColor" | "hiliteColor" } | null>(null);

  // The editor owns its DOM. React must never write innerHTML here: doing so
  // resets the caret to offset 0, which is why clicking mid-paragraph used to
  // jump back to the first line. We only seed content while unfocused.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const focused = el === document.activeElement || el.contains(document.activeElement);
    if (focused) return;
    if (value === lastEmit.current) return;
    el.innerHTML = value || "";
    lastEmit.current = value;
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

  function rememberSelection() {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !ref.current?.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    // A collapsed selection means the user just placed a caret — forget any
    // older highlight so toolbar clicks act where they clicked.
    lastRange.current = range.collapsed ? null : range.cloneRange();
  }

  function run(cmd: string, point?: { x: number; y: number }) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Clicking inside nested inline tags can park the caret on the container
    // element, where arrow keys do nothing. Re-derive it from the click point.
    const sel0 = window.getSelection();
    const r0 = sel0?.rangeCount ? sel0.getRangeAt(0) : null;
    if (point && r0 && r0.collapsed && r0.startContainer === el) {
      const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
      const hit = doc.caretPositionFromPoint?.(point.x, point.y);
      if (hit) {
        const nr = document.createRange();
        nr.setStart(hit.offsetNode, hit.offset);
        nr.collapse(true);
        sel0?.removeAllRanges();
        sel0?.addRange(nr);
      }
    }
    // Restore a live selection that survived the mousedown preventDefault.
    {
      const live = window.getSelection();
      if (live?.rangeCount && !live.isCollapsed && el.contains(live.anchorNode)) {
        lastRange.current = live.getRangeAt(0).cloneRange();
      }
    }
    // Restore the last real selection if clicking the toolbar collapsed it.
    const selAtStart = window.getSelection();
    if (lastRange.current && (!selAtStart || !selAtStart.rangeCount || selAtStart.isCollapsed)) {
      selAtStart?.removeAllRanges();
      selAtStart?.addRange(lastRange.current);
    }
    // Re-select the last range the user made inside this editor. Clicking a
    // toolbar button can collapse or move the live selection between blocks,
    // which is why formatting sometimes "did nothing".
    const saved = lastRange.current;
    const selNow = window.getSelection();
    if (saved && (!selNow || selNow.rangeCount === 0 || selNow.isCollapsed)) {
      selNow?.removeAllRanges();
      selNow?.addRange(saved);
    }
    if (cmd === "foreColor" || cmd === "hiliteColor") {
      const sel = window.getSelection();
      let range: Range | null = sel?.rangeCount && !sel.isCollapsed && el.contains(sel.anchorNode) ? sel.getRangeAt(0) : lastRange.current;
      if (!range || range.collapsed) {
        // No live selection — colour the word under the caret instead.
        const live = sel?.rangeCount ? sel.getRangeAt(0) : null;
        const node = live?.startContainer;
        if (live?.collapsed && node?.nodeType === Node.TEXT_NODE && el.contains(node)) {
          const text = node.textContent ?? "";
          let a = live.startOffset, b = live.startOffset;
          while (a > 0 && !/\s/.test(text[a - 1])) a -= 1;
          while (b < text.length && !/\s/.test(text[b])) b += 1;
          if (b > a) {
            const word = document.createRange();
            word.setStart(node, a);
            word.setEnd(node, b);
            range = word;
            sel?.removeAllRanges();
            sel?.addRange(word);
            lastRange.current = word.cloneRange();
          }
        }
      }
      if (!range || range.collapsed || !el.contains(range.commonAncestorContainer)) return;
      const rect = range.getBoundingClientRect();
      setColorPopup({
        x: Math.max(8, Math.min(rect.left ?? el.getBoundingClientRect().left, window.innerWidth - 260)),
        y: (rect.bottom ?? el.getBoundingClientRect().top) + 6,
        cmd,
      });
      return;
    }
    if (cmd === "mark" || cmd === "underline" || cmd === "strikeThrough") {
      const tag = cmd === "mark" ? "mark" : cmd === "underline" ? "u" : "s";
      const sel = window.getSelection();
      let range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      if (!range || range.collapsed) range = lastRange.current;
      if (!range || range.collapsed) return;
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      if (!el.contains(range.commonAncestorContainer)) {
        // Selection drifted outside this editor — fall back to its whole text.
        range = document.createRange();
        range.selectNodeContents(el);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      // If a shift+arrow keyboard selection exists, extend via the native API —
      // manual surround sometimes no-ops when start/end sit in different nodes.
      const selNow = window.getSelection();
      if (selNow?.rangeCount) {
        const live = selNow.getRangeAt(0);
        if (!live.collapsed && el.contains(live.commonAncestorContainer)) {
          range = live;
        }
      }
      const existing = range.commonAncestorContainer.parentElement?.closest(tag);
      if (existing && el.contains(existing)) {
        const parent = existing.parentNode;
        if (parent) {
          while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
          parent.removeChild(existing);
          parent.normalize();
        }
      } else {
        const wrapEl = document.createElement(tag);
        try {
          range.surroundContents(wrapEl);
        } catch {
          wrapEl.appendChild(range.extractContents());
          range.insertNode(wrapEl);
        }
        sel?.removeAllRanges();
      }
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

  function applyColor(color: string) {
    const el = ref.current;
    if (!el || !colorPopup) return;
    el.focus();
    const sel = window.getSelection();
    const range = lastRange.current;
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    try {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(colorPopup.cmd, false, colorPopup.cmd === "hiliteColor" ? color : color);
    } catch {
      /* older browsers */
    }
    setColorPopup(null);
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
            onMouseDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              if (sel?.rangeCount && !sel.getRangeAt(0).collapsed && ref.current?.contains(sel.anchorNode)) {
                lastRange.current = sel.getRangeAt(0).cloneRange();
              }
            }}
            onClick={(e) => run(t.cmd, { x: e.clientX, y: e.clientY })}
            className={`${styles.tool} ${active[t.cmd] ? styles.toolOn : ""}`}
            aria-pressed={Boolean(active[t.cmd])}
          >
            {t.label}
          </button>
        ))}
      </div>
      {colorPopup ? (
        <div className={styles.swatches} style={{ left: colorPopup.x, top: colorPopup.y }} role="menu" aria-label="Pick a colour">
          {SWATCHES.map((c) => (
            <button key={c} type="button" className={styles.swatch} style={{ background: c }} title={c} onMouseDown={(e) => e.preventDefault()} onClick={() => applyColor(c)} />
          ))}
          <label className={styles.customColor} onMouseDown={(e) => e.preventDefault()}>
            <input type="color" onChange={(e) => applyColor(e.target.value)} aria-label="Custom colour" />
            <span>Custom</span>
          </label>
        </div>
      ) : null}
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
        onBlur={() => {
          const sel = window.getSelection();
          if (sel?.rangeCount && !sel.getRangeAt(0).collapsed && ref.current?.contains(sel.anchorNode)) {
            lastRange.current = sel.getRangeAt(0).cloneRange();
          }
          emit();
        }}
        onKeyUp={() => {
          refreshActive();
          rememberSelection();
        }}
        onMouseUp={() => {
          refreshActive();
          rememberSelection();
        }}
        onFocus={refreshActive}
      />
    </div>
  );
}
