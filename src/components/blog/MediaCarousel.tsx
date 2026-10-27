"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MediaCarousel.module.scss";

/* blog.google media rail: big rounded tiles that bleed off the right edge,
   joined arrow pill + progress line. Any tile click opens the lightbox. */
export function MediaCarousel({ items, onOpen }: { items: { src: string; alt: string; index: number }[]; onOpen: (lightboxIndex: number) => void }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setProgress(max <= 0 ? 1 : Math.min(Math.max(t.scrollLeft / max, 0), 1));
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(delta: number) {
    const t = trackRef.current;
    if (!t) return;
    const first = t.children[0] as HTMLElement | undefined;
    const step = (first?.offsetWidth ?? 280) + 16;
    // Page by one visible row worth of tiles for a premium carousel feel.
    t.scrollBy({ left: step * delta, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <ul
        className={styles.track}
        ref={trackRef}
        onScroll={update}
        onPointerDown={(e) => {
          const t = trackRef.current;
          if (e.pointerType !== "mouse" || !t) return;
          const start = { down: true, startX: e.clientX, startLeft: t.scrollLeft, moved: false };
          drag.current = start;
          t.classList.add(styles.dragging);
          const move = (ev: PointerEvent) => {
            if (!trackRef.current || !start.down) return;
            const dx = ev.clientX - start.startX;
            if (Math.abs(dx) > 4) {
              start.moved = true;
              trackRef.current.scrollLeft = start.startLeft - dx;
            }
          };
          const up = () => {
            start.down = false;
            trackRef.current?.classList.remove(styles.dragging);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
          drag.current.moved = false;
        }}
      >
        {items.map((it, i) => (
          <li key={i} className={styles.item} style={{ "--peek": i === 0 && items.length > 1 ? "1" : "0" } as React.CSSProperties}>
            <button type="button" className={styles.tile} onClick={() => it.index >= 0 && onOpen(it.index)} aria-label={`Zoom image: ${it.alt}`}>
              <Image
                src={it.src}
                alt={it.alt}
                width={1200}
                height={750}
                sizes="(max-width: 760px) 86vw, (max-width: 1100px) 70vw, 62vw"
                className={styles.img}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => go(-1)} aria-label="Previous images">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => go(1)} aria-label="Next images">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ transform: `scaleX(${Math.max(progress, 0.08)})` }} />
        </span>
      </div>
    </div>
  );
}
