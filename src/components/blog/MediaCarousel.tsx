"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MediaCarousel.module.scss";

/* blog.google media rail: cards that peek off both edges of the reading
   column, a one-line caption with a round "+" expander under each card, and
   the joined arrow pair with a progress line beneath the strip. */
export interface CarouselItem {
  src: string;
  alt: string;
  index: number;
  video?: boolean;
  size?: string;
  caption?: string;
}

export function MediaCarousel({ items, onOpen }: { items: CarouselItem[]; onOpen: (lightboxIndex: number) => void }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [max, setMax] = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [playing, setPlaying] = useState<Record<number, boolean>>({});

  // The card whose left edge is nearest the current scroll position is the
  // "active" one — this stays true for both paging and free dragging.
  // Cards are positioned relative to the page, not the track, so compare
  // bounding rects rather than offsetLeft.
  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const limit = t.scrollWidth - t.clientWidth;
    setMax(limit);
    setProgress(limit <= 0 ? 1 : Math.min(Math.max(t.scrollLeft / limit, 0), 1));

    const trackLeft = t.getBoundingClientRect().left;
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    const cards = Array.from(t.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((el, i) => {
      // Distance from where this card *should* sit when fully aligned.
      const dist = Math.abs(el.getBoundingClientRect().left - (trackLeft + pad));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(delta: number) {
    const t = trackRef.current;
    if (!t) return;
    const next = Math.min(Math.max(active + delta, 0), Math.max(items.length - 1, 0));
    const el = t.children[next] as HTMLElement | undefined;
    if (!el) return;
    const trackLeft = t.getBoundingClientRect().left;
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    // Card's left edge is currently this far into the scrollable content.
    const cardStart = el.getBoundingClientRect().left - trackLeft + t.scrollLeft - pad;
    const left = Math.min(Math.max(cardStart, 0), t.scrollWidth - t.clientWidth);
    t.scrollTo({ left, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  const atStart = active <= 0;
  const atEnd = max > 0 && active >= items.length - 1;

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
          <li key={i} className={styles.item}>
            {it.video ? (
              <div className={styles.tile}>
                <video
                  src={it.src}
                  playsInline
                  preload="metadata"
                  controls={Boolean(playing[i])}
                  loop
                  className={styles.img}
                  onPlay={() => setPlaying((p) => ({ ...p, [i]: true }))}
                  onPause={() => setPlaying((p) => ({ ...p, [i]: false }))}
                  aria-label={it.alt}
                />
                {!playing[i] ? (
                  <button
                    type="button"
                    className={styles.videoPlay}
                    onClick={(e) => {
                      const video = (e.currentTarget.parentElement?.querySelector("video")) as HTMLVideoElement | null;
                      video?.play();
                    }}
                    aria-label={`Play video: ${it.alt}`}
                  >
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.5v13l11-6.5z" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.tile} ${it.size === "portrait" ? styles.tilePortrait : it.size === "square" ? styles.tileSquare : it.size === "wide" ? styles.tileWide : ""}`}
                onClick={() => it.index >= 0 && onOpen(it.index)}
                aria-label={`Zoom image: ${it.alt}`}
              >
                <Image src={it.src} alt={it.alt} fill sizes="60vw" className={styles.img} />
              </button>
            )}

            {it.caption || it.alt ? (
              <div className={styles.captionRow}>
                <p className={expanded[i] ? `${styles.caption} ${styles.captionOpen}` : styles.caption}>
                  {it.caption || it.alt}
                </p>
                <button
                  type="button"
                  className={expanded[i] ? `${styles.expand} ${styles.expandOpen}` : styles.expand}
                  onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                  aria-expanded={Boolean(expanded[i])}
                  aria-label={expanded[i] ? "Show less" : "Show more"}
                  title={expanded[i] ? "Show less" : "Show more"}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    {expanded[i] ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
                  </svg>
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {items.length > 1 ? (
        <div className={styles.controls}>
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(-1)}
              disabled={atStart}
              aria-label="Previous images"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label="Next images"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
          <span className={styles.progress} aria-hidden="true">
            <span className={styles.progressFill} style={{ transform: `scaleX(${Math.max(progress, 0.1)})` }} />
          </span>
        </div>
      ) : null}
    </div>
  );
}
