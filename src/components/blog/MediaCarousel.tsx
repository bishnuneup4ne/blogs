"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MediaCarousel.module.scss";

/* blog.google media rail: big rounded tiles that bleed off the right edge,
   joined arrow pill + progress line. Any tile click opens the lightbox. */
export interface CarouselItem { src: string; alt: string; index: number; video?: boolean; size?: string }

export function MediaCarousel({ items, onOpen }: { items: CarouselItem[]; onOpen: (lightboxIndex: number) => void }) {
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
    const per = (first?.offsetWidth ?? 420) + 16;
    // Page exactly one tile — the strip glides right-to-left / left-to-right.
    t.scrollBy({ left: per * delta, behavior: "smooth" });
    window.setTimeout(() => {
      const idx = Math.round(t.scrollLeft / per);
      const target = delta > 0 ? idx : Math.max(0, idx - 1);
      const el = t.children[target] as HTMLElement | undefined;
      if (!el || el.dataset.sliding) return;
      el.dataset.sliding = "1";
      el.classList.remove(styles.slideRight, styles.slideLeft);
      void el.offsetWidth;
      el.classList.add(delta > 0 ? styles.slideRight : styles.slideLeft);
      window.setTimeout(() => {
        el.classList.remove(styles.slideRight, styles.slideLeft);
        delete el.dataset.sliding;
      }, 460);
    }, 380);
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
            <button
              type="button"
              className={`${styles.tile} ${it.size === "portrait" ? styles.tilePortrait : it.size === "square" ? styles.tileSquare : it.size === "wide" ? styles.tileWide : ""}`}
              onClick={() => it.index >= 0 && onOpen(it.index)}
              aria-label={it.video ? `Play video: ${it.alt}` : `Zoom image: ${it.alt}`}
            >
              {it.video ? (
                <video src={it.src} muted playsInline preload="metadata" className={styles.img} poster="" />
              ) : (
                <Image
                  src={it.src}
                  alt={it.alt}
                  fill
                  sizes="50vw"
                  className={styles.img}
                />
              )}
              {it.video ? <span className={styles.playBadge} aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg></span> : null}
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
