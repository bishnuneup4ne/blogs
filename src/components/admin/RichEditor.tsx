"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./RichEditor.module.scss";

type PopupCmd = "foreColor" | "hiliteColor" | "underlineColor" | "strikeColor" | "boldColor" | "italicColor";

const TOOLS: { cmd: string; tag: string; label: string; title: string; color?: PopupCmd }[] = [
  { cmd: "bold", tag: "strong", label: "B", title: "Bold (Ctrl+B) — ▾ for colour", color: "boldColor" },
  { cmd: "italic", tag: "em", label: "I", title: "Italic (Ctrl+I) — ▾ for colour", color: "italicColor" },
  { cmd: "underline", tag: "u", label: "U", title: "Underline (Ctrl+U) — long-press ▾ for colour" , color: "underlineColor" },
  { cmd: "strikeThrough", tag: "s", label: "S", title: "Strikethrough — long-press ▾ for colour", color: "strikeColor" },
  { cmd: "foreColor", tag: "", label: "A", title: "Font colour", color: "foreColor" },
  { cmd: "hiliteColor", tag: "", label: "H", title: "Highlight colour", color: "hiliteColor" },
  { cmd: "link", tag: "a", label: "Link", title: "Add link" },
  { cmd: "removeFormat", tag: "", label: "Clear", title: "Clear formatting" },
];

const SWATCHES = ["#d93025", "#e37400", "#f9ab00", "#188038", "#1a73e8", "#9334e6", "#c5221f", "#202124"];
const COLOR_CMDS: PopupCmd[] = ["foreColor", "hiliteColor", "underlineColor", "strikeColor", "boldColor", "italicColor"];

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
  const [focused, setFocused] = useState(false);
  const [colorPopup, setColorPopup] = useState<{ x: number; y: number; cmd: PopupCmd } | null>(null);
  const popupRange = useRef<Range | null>(null);

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

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* Smart typing: markdown-ish shortcuts convert as you type —
     `- ` / `1. ` → a real list, `**bold**` → <strong>,
     `[label](url)` → link, and a bare URL becomes an autolink. */
  function smartType() {
    const el = ref.current;
    if (!el) return;
    const text = el.innerText ?? "";
    if (/^(?:[-*•]|\d+[.)])\s$/.test(text)) {
      const ordered = /^\d/.test(text);
      el.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertHTML", false, ordered ? "<ol><li><br></li></ol>" : "<ul><li><br></li></ul>");
      return;
    }
    const replaceTail = (pattern: RegExp, build: (m: RegExpMatchArray) => string | null) => {
      const sel = window.getSelection();
      if (!sel || !el.contains(sel.anchorNode)) return;
      const node = sel.anchorNode;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const before = node.textContent?.slice(0, sel.anchorOffset) ?? "";
      const m = before.match(pattern);
      if (!m || !m[0]) return;
      const html = build(m);
      if (!html) return;
      const range = document.createRange();
      range.setStart(node, Math.max(0, sel.anchorOffset - m[0].length));
      range.setEnd(node, sel.anchorOffset);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertHTML", false, html);
    };
    replaceTail(/\*\*([^*\n]{1,300})\*\*$/, (m) =>
      m[1].trim() ? `<strong>${escapeHtml(m[1])}</strong>` : null,
    );
    replaceTail(/\[([^\]\n]{1,200})\]\((\/[^\s)]{1,300}|https?:\/\/[^\s)]{1,400})\)$/, (m) =>
      `<a href="${m[2]}">${escapeHtml(m[1])}</a>`,
    );
    replaceTail(/(https?:\/\/[^\s<>"']{6,400})$/, (m) =>
      m[1] ? `<a href="${m[1]}">${m[1]}</a>` : null,
    );
  }

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
    if (COLOR_CMDS.includes(cmd as PopupCmd)) {
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
      // Clicking the same colour button again closes the picker.
      if (colorPopup?.cmd === cmd) {
        setColorPopup(null);
        popupRange.current = null;
        return;
      }
      popupRange.current = range.cloneRange();
      const rect = range.getBoundingClientRect();
      // Swatch row is ~430px wide, ~52px tall — keep it fully on screen and
      // prefer opening upward when there's no room below the caret.
      const W = 440;
      const H = 56;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(8, Math.min(rect.left || el.getBoundingClientRect().left, vw - W - 8));
      const below = (rect.bottom ?? el.getBoundingClientRect().top) + 8;
      const y = below + H > vh ? Math.max(8, below - H - 24) : below;
      setColorPopup({ x, y, cmd: cmd as PopupCmd });
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

  function applyStyledTag(tag: string, style: string) {
    const el = ref.current;
    const sel = window.getSelection();
    const range = sel?.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : lastRange.current;
    if (!el || !range || range.collapsed || !el.contains(range.commonAncestorContainer)) return;
    const wrapEl = document.createElement(tag);
    wrapEl.setAttribute("style", style);
    try {
      range.surroundContents(wrapEl);
    } catch {
      wrapEl.appendChild(range.extractContents());
      range.insertNode(wrapEl);
    }
    sel?.removeAllRanges();
  }

  function applyLineColor(tag: "u" | "s", color: string) {
    const el = ref.current;
    const sel = window.getSelection();
    const range = sel?.rangeCount ? sel.getRangeAt(0) : lastRange.current;
    if (!el || !range || range.collapsed || !el.contains(range.commonAncestorContainer)) return;
    const wrapEl = document.createElement(tag);
    wrapEl.setAttribute("style", `text-decoration-line: ${tag === "u" ? "underline" : "line-through"}; text-decoration-color: ${color};`);
    try {
      range.surroundContents(wrapEl);
    } catch {
      wrapEl.appendChild(range.extractContents());
      range.insertNode(wrapEl);
    }
    sel?.removeAllRanges();
  }

  function applyColor(color: string) {
    const el = ref.current;
    if (!el || !colorPopup) return;
    el.focus();
    const sel = window.getSelection();
    const range = popupRange.current ?? lastRange.current;
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    try {
      if (color === "none") {
        removeColor(colorPopup.cmd);
      } else if (colorPopup.cmd === "foreColor" || colorPopup.cmd === "hiliteColor") {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand(colorPopup.cmd, false, color);
      } else if (colorPopup.cmd === "underlineColor" || colorPopup.cmd === "strikeColor") {
        applyLineColor(colorPopup.cmd === "underlineColor" ? "u" : "s", color);
      } else {
        applyStyledTag(colorPopup.cmd === "boldColor" ? "strong" : "em", `color: ${color}`);
      }
    } catch {
      /* older browsers */
    }
    setColorPopup(null);
    popupRange.current = null;
    emit();
  }

  // Strip the colour this tool would have applied from the saved range.
  function removeColor(cmd: PopupCmd) {
    const el = ref.current;
    const range = popupRange.current;
    if (!el || !range) return;
    const propFor: Record<PopupCmd, string> = {
      foreColor: "color",
      hiliteColor: "background-color",
      boldColor: "color",
      italicColor: "color",
      underlineColor: "text-decoration-color",
      strikeColor: "text-decoration-color",
    };
    const prop = propFor[cmd];
    const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
    const nodes = startEl ? [...startEl.querySelectorAll("[style]")] : [];
    // include ancestors of the selection too
    let anc = startEl;
    while (anc && anc !== el) { nodes.push(anc); anc = anc.parentElement; }
    for (const n of nodes) {
      const style = (n as HTMLElement).style;
      if (!style.getPropertyValue(prop)) continue;
      if (cmd === "underlineColor" || cmd === "strikeColor") {
        style.removeProperty("text-decoration-color");
        style.removeProperty("text-decoration-line");
        style.removeProperty("text-decoration-thickness");
        style.removeProperty("text-underline-offset");
        if (!style.cssText.trim()) { unwrap(n as HTMLElement); }
      } else if (prop === "background-color" && n instanceof HTMLElement && n.tagName === "MARK") {
        unwrap(n);
      } else {
        style.removeProperty(prop);
        if (!style.cssText.trim() && (n as HTMLElement).tagName === "SPAN") unwrap(n as HTMLElement);
      }
    }
    el.normalize();
  }

  function unwrap(node: HTMLElement) {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  return (
    <div className={focused ? `${styles.wrap} ${styles.wrapFocused}` : styles.wrap}>
      {(focused || colorPopup) ? (
      <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
        {TOOLS.map((t) => {
          const saveSel = (e: React.MouseEvent) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel?.rangeCount && !sel.getRangeAt(0).collapsed && ref.current?.contains(sel.anchorNode)) {
              lastRange.current = sel.getRangeAt(0).cloneRange();
            }
          };
          return (
            <span key={t.cmd} className={styles.toolGroup}>
              <button
                type="button"
                title={t.title}
                onMouseDown={saveSel}
                onClick={(e) => run(t.cmd, { x: e.clientX, y: e.clientY })}
                className={`${styles.tool} ${active[t.cmd] ? styles.toolOn : ""}`}
                aria-pressed={Boolean(active[t.cmd])}
              >
                {t.label}
              </button>
              {t.color && t.cmd !== "foreColor" && t.cmd !== "hiliteColor" ? (
                <button
                  type="button"
                  className={styles.caret}
                  aria-label={`${t.label} colour`}
                  title={`${t.label} colour`}
                  onMouseDown={saveSel}
                  onClick={(e) => run(t.color!, { x: e.clientX, y: e.clientY })}
                >
                  ▾
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      ) : null}
      {colorPopup ? (
        <>
          <div className={styles.popupScrim} onMouseDown={(e) => { e.preventDefault(); setColorPopup(null); popupRange.current = null; }} />
          <div className={styles.swatches} style={{ left: colorPopup.x, top: colorPopup.y }} role="menu" aria-label="Pick a colour">
            {SWATCHES.map((c) => (
              <button key={c} type="button" className={styles.swatch} style={{ background: c }} title={c} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); applyColor(c); }} />
            ))}
            <label className={styles.customColor} onMouseDown={(e) => e.preventDefault()}>
              <input type="color" onChange={(e) => applyColor(e.target.value)} aria-label="Custom colour" />
              <span>Custom</span>
            </label>
            <button
              type="button"
              className={styles.noneBtn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); applyColor("none"); }}
            >
              None
            </button>
          </div>
        </>
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
        onInput={() => {
          emit();
          smartType();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;
          const el = ref.current;
          const sel = window.getSelection();
          if (!el || !sel?.anchorNode || !el.contains(sel.anchorNode)) return;
          // Find the list item holding the caret, if any.
          let node: Node | null = sel.anchorNode;
          let li: HTMLElement | null = null;
          while (node && node !== el) {
            if (node instanceof HTMLElement && node.tagName === "LI") {
              li = node;
              break;
            }
            node = node.parentNode;
          }
          if (!li) return; // outside a list — normal Enter
          if ((li.textContent ?? "").trim()) return; // non-empty: browser continues the list
          // Enter on an empty bullet ends the list and starts a fresh paragraph.
          e.preventDefault();
          const list = li.parentElement;
          li.remove();
          const p = document.createElement("p");
          p.innerHTML = "<br>";
          if (!list || list.children.length === 0) {
            list?.remove();
            el.appendChild(p);
          } else {
            list.parentNode?.insertBefore(p, list.nextSibling);
          }
          const range = document.createRange();
          range.selectNodeContents(p);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          emit();
        }}
        onBlur={() => {
          setFocused(false);
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
        onFocus={() => {
          setFocused(true);
          refreshActive();
        }}
      />
    </div>
  );
}
