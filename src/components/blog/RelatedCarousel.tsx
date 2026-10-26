"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCategory } from "@/lib/categories";
import type { ScoredPost } from "@/lib/recommend";
import styles from "./RelatedCarousel.module.scss";

/* blog.google-style browse row: identical grey cards (media tile on a pastel
   shape, kicker + title + byline) with circular arrows and a progress line. */
export function RelatedCarousel({ items }: { items: ScoredPost[] }) {
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
          if (e.pointerType !== "mouse" || !trackRef.current) return;
          drag.current = { down: true, startX: e.clientX, startLeft: trackRef.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const t = trackRef.current;
          if (!t || !drag.current.down) return;
          const dx = e.clientX - drag.current.startX;
          if (Math.abs(dx) > 6) {
            drag.current.moved = true;
            t.classList.add(styles.dragging);
            t.scrollLeft = drag.current.startLeft - dx;
          }
        }}
        onPointerUp={() => {
          drag.current.down = false;
          trackRef.current?.classList.remove(styles.dragging);
        }}
        onPointerLeave={() => {
          drag.current.down = false;
          trackRef.current?.classList.remove(styles.dragging);
        }}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {items.map(({ post }, i) => {
          const category = getCategory(post.category);
          return (
            <li key={post.slug} className={styles.item}>
              <Link href={`/blog/${post.slug}`} className={styles.card}>
                <span className={`${styles.media} ${styles[`shape${i % 4}`]}`}>
                  {post.cover ? (
                    <Image
                      src={post.cover.src}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 78vw, 300px"
                      className={styles.img}
                    />
                  ) : null}
                </span>
                <span className={styles.body}>
                  <span className={styles.kicker}>{category.name}</span>
                  <span className={styles.title}>{post.title}</span>
                  <span className={styles.byline}>By {post.author.name}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => go(-1)}
            disabled={progress <= 0.001}
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
            disabled={progress >= 0.999}
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
