"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./ArticleProgress.module.scss";

/* blog.google-style reading progress: a slim bar pinned under the site header
   that fills as the article scrolls, with the post title beside it. */
export function ArticleProgress({ title }: { title: string }) {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const el = document.querySelector("article");
      if (!el || !fillRef.current) return;
      const total = el.offsetHeight - window.innerHeight;
      const done = total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 1;
      fillRef.current.style.transform = `scaleX(${done})`;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.bar} aria-hidden="true">
      <span className={styles.track}>
        <span ref={fillRef} className={styles.fill} />
      </span>
      <Link href="/blog" className={styles.home} aria-label="Back to all posts">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      <p className={styles.title}>{title}</p>
      <span className={styles.shareSlot} />
    </div>
  );
}
