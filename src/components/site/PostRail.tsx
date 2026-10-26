"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCategory } from "@/lib/categories";
import type { Post } from "@/lib/types";
import styles from "./PostRail.module.scss";

/* Horizontal rail matching the article "Related stories" cards: identical
   grey tiles on pastel shapes, joined arrow controls + progress line. */
export function PostRail({ posts }: { posts: Post[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
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

  function go(dir: 1 | -1) {
    const t = trackRef.current;
    if (!t) return;
    const first = t.children[0] as HTMLElement | undefined;
    const step = (first?.offsetWidth ?? 300) + 16;
    t.scrollBy({ left: step * dir, behavior: "smooth" });
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.track} ref={trackRef} onScroll={update}>
        {posts.map((post, i) => (
          <li key={post.slug} className={styles.item}>
            <Link href={`/blog/${post.slug}`} className={styles.card}>
              <span className={`${styles.media} ${styles[`shape${i % 4}`]}`}>
                {post.cover ? (
                  <Image
                    src={post.cover.src}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 78vw, 300px"
                    className={styles.img}
                  />
                ) : (
                  <span className={`${styles.img} ${styles.imgFallback}`} />
                )}
              </span>
              <span className={styles.body}>
                <span className={styles.kicker}>{getCategory(post.category).name}</span>
                <span className={styles.title}>{post.title}</span>
                <span className={styles.byline}>{post.readingMinutes} min read</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => go(-1)}
            disabled={progress <= 0.001}
            aria-label="Previous posts"
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
            aria-label="Next posts"
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
