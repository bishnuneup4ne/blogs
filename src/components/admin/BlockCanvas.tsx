"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./BlockCanvas.module.scss";

/* Pointer-driven block reordering. Press and hold a block's handle, then drag
   it anywhere in the list: the dragged block follows the cursor while a
   placeholder shows exactly where it will land. Works with mouse, touch and
   pen, and never fights text selection inside the block. */
export function useBlockDrag<T>({
  items,
  onReorder,
}: {
  items: T[];
  onReorder: (from: number, to: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; startY: number; offsetY: number; active: boolean } | null>(null);
  const [dragging, setDragging] = useState<{ from: number; to: number; y: number; height: number } | null>(null);

  const blockRects = useCallback(() => {
    const list = listRef.current;
    if (!list) return [];
    return Array.from(list.querySelectorAll<HTMLElement>("[data-block-index]")).map((el) => {
      const r = el.getBoundingClientRect();
      return { index: Number(el.dataset.blockIndex), top: r.top, bottom: r.bottom, mid: r.top + r.height / 2, height: r.height };
    });
  }, []);

  const start = useCallback(
    (index: number, event: React.PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();
      const list = listRef.current;
      if (!list) return;
      const el = list.querySelector<HTMLElement>(`[data-block-index="${index}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      drag.current = { from: index, startY: event.clientY, offsetY: event.clientY - rect.top, active: false };
      // Hold briefly before the drag engages so a click still selects text.
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
      setDragging({ from: index, to: index, y: event.clientY, height: rect.height });
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.active) {
        if (Math.abs(e.clientY - d.startY) < 5) return;
        d.active = true;
        document.body.classList.add(styles.draggingBody);
      }
      const rects = blockRects();
      let to = d.from;
      for (const r of rects) {
        if (e.clientY < r.mid) {
          to = r.index;
          break;
        }
        to = r.index;
      }
      setDragging((prev) => (prev ? { ...prev, to, y: e.clientY } : prev));
    };

    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      document.body.classList.remove(styles.draggingBody);
      setDragging((prev) => {
        if (prev && d?.active && prev.from !== prev.to) onReorder(prev.from, prev.to);
        return null;
      });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, blockRects, onReorder]);

  return { listRef, dragging, start };
}

/* The slash menu — type "/" at the start of an empty paragraph and a block
   palette opens right above the caret, Decipad style. */
export interface SlashItem {
  type: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

export function SlashMenu({
  items,
  query,
  activeIndex,
  onPick,
}: {
  items: SlashItem[];
  query: string;
  activeIndex: number;
  onPick: (type: string) => void;
}) {
  const filtered = items.filter(
    (i) => !query || i.label.toLowerCase().includes(query) || i.hint.toLowerCase().includes(query),
  );
  if (filtered.length === 0) return null;

  return (
    <div className={styles.slash} role="listbox" aria-label="Insert block">
      <p className={styles.slashLabel}>Insert block</p>
      {filtered.map((item, i) => (
        <button
          key={item.type}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          className={i === activeIndex ? `${styles.slashItem} ${styles.slashItemActive}` : styles.slashItem}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(item.type);
          }}
        >
          <span className={styles.slashIcon}>{item.icon}</span>
          <span className={styles.slashText}>
            <span className={styles.slashTitle}>{item.label}</span>
            <span className={styles.slashHint}>{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
