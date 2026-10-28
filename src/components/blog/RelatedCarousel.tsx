"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ScoredPost } from "@/lib/recommend";
import { getCategory } from "@/lib/categories";
import styles from "./RelatedCarousel.module.scss";
import { routes } from "@/lib/routes";

/* blog.google "More updates" row: grey tile, cover cropped inside a blob
   mask, kicker → title → byline below. Circular arrows + progress line. */
const BLOBS = [styles.blob0, styles.blob1, styles.blob2, styles.blob3];
export function RelatedCarousel({ items }: { items: ScoredPost[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const left = t.scrollLeft;
    setScrollable(max > 8);
    setProgress(max <= 0 ? 1 : Math.min(Math.max(left / max, 0), 1));
    setAtStart(left <= 4);
    setAtEnd(max <= 0 || left >= max - 4);
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
    const step = (first?.offsetWidth ?? 300) + 16;
    t.scrollBy({ left: step * delta, behavior: "smooth" });
  }

  return (
    <div>
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
          // Prevent default on mouse down to avoid text selection
          if (e.pointerType === "mouse") e.preventDefault();
        }}
        onClickCapture={(e) => {
          // Suppress the synthetic click that follows a real mouse-drag only.
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
          drag.current.moved = false;
        }}
      >
        {items.map(({ post }, i) => (
          <li key={post.slug} className={styles.item}>
            <Link href={routes.post(post.slug)} className={styles.card}>
              <span className={styles.media}>
                <span className={`${styles.blob} ${BLOBS[i % BLOBS.length]}${post.cover ? "" : ` pastel-${getCategory(post.category).pastel}`}`}>
                  {post.cover ? (
                    <Image
                      src={post.cover.src}
                      alt={post.title}
                      fill
                      sizes="(max-width: 900px) 78vw, 300px"
                      className={styles.img}
                    />
                  ) : null}
                </span>
              </span>
              <span className={styles.eyebrow}>{getCategory(post.category).name}</span>
              <span className={styles.title}>{post.title}</span>
              <span className={styles.byline}>
                By {post.author.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={scrollable ? styles.controls : `${styles.controls} ${styles.controlsHidden}`}>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => go(-1)}
            disabled={atStart}
            aria-label="Previous stories"
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
            aria-label="More stories"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ transform: `scaleX(${Math.max(progress, 0.06)})` }} />
        </span>
      </div>
    </div>
  );
}
