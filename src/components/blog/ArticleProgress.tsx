"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import { ShareMenu } from "./ShareMenu";
import styles from "./ArticleProgress.module.scss";

/* blog.google-style reading progress: a slim bar pinned to the top that fills
   as the article scrolls. It reveals itself (with a slide-down) once the
   headline has scrolled past; until then it stays invisible. */
export function ArticleProgress({ title, shareUrl }: { title: string; shareUrl: string }) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const el = document.querySelector("article");
      if (!el || !fillRef.current) return;
      const total = el.offsetHeight - window.innerHeight;
      const done = total > 0 ? Math.min(Math.max(window.scrollY / total, 0), 1) : 1;
      fillRef.current.style.transform = `scaleX(${done})`;
      const h1 = document.querySelector("h1");
      const bar = barRef.current;
      if (!bar) return;
      const passed = h1 ? h1.getBoundingClientRect().top < 0 : window.scrollY > 200;
      if (passed && !shownRef.current) {
        shownRef.current = true;
        bar.removeAttribute("data-visible");
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.fromTo(bar, { y: "-100%" }, { y: 0, duration: 0.35, ease: "power3.out" });
        }
      } else if (!passed && shownRef.current) {
        shownRef.current = false;
        bar.setAttribute("data-visible", "off");
        gsap.killTweensOf(bar);
        gsap.set(bar, { y: 0 });
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={barRef} className={styles.bar} data-visible="off">
      <span className={styles.track} aria-hidden="true">
        <span ref={fillRef} className={styles.fill} />
      </span>
      <div className={styles.inner}>
        <Link href="/blog" className={styles.title}>{title}</Link>
        <ShareMenu title={title} url={shareUrl} compact />
      </div>
    </div>
  );
}
