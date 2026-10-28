"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import Link from "next/link";
import { ShareMenu } from "./ShareMenu";
import styles from "./ArticleProgress.module.scss";
import { routes } from "@/lib/routes";

/* blog.google-style reading progress: a slim bar pinned to the top that fills
   as the article scrolls. It reveals itself (with a slide-down) once the
   headline has scrolled past; until then it stays invisible. */
export function ArticleProgress({
  title,
  coverUrl,
  postSlug,
  shareUrl,
  avatarUrl,
  siteName,
}: {
  title: string;
  coverUrl?: string;
  postSlug: string;
  shareUrl: string;
  avatarUrl?: string;
  siteName?: string;
}) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);
  /* Rendered on <body>: the article's .page grid is a `container-type`
     context, so a bar living inside it could never paint above the headings
     scrolling underneath. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const passed = h1 ? h1.getBoundingClientRect().top < -((parseFloat(getComputedStyle(bar).height) || 60) * 0.5) : window.scrollY > 280;
      if (passed && !shownRef.current) {
        shownRef.current = true;
        bar.setAttribute("data-visible", "on");
        gsap.killTweensOf(bar);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(bar, { y: 0, opacity: 1 });
        } else {
          gsap.fromTo(bar, { y: "-100%", opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
        }
      } else if (!passed && shownRef.current) {
        shownRef.current = false;
        gsap.killTweensOf(bar);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.to(bar, {
            y: "-100%",
            opacity: 0,
            duration: 0.28,
            ease: "power2.in",
            onComplete: () => {
              // Fixed positioning: parking it at its hidden offset keeps it
              // out of the way without reserving space in the page.
              if (barRef.current && shownRef.current === false) {
                barRef.current.setAttribute("data-visible", "off");
                gsap.set(barRef.current, { y: "-100%" });
              }
            },
          });
        } else {
          bar.setAttribute("data-visible", "off");
          gsap.set(bar, { y: "-100%" });
        }
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    if (barRef.current) barRef.current.setAttribute("data-visible", "off");
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

  if (!mounted) return null;

  return createPortal(
    <div ref={barRef} className={styles.bar} data-article-progress="" data-visible="off">
      <span className={styles.track} aria-hidden="true">
        <span ref={fillRef} className={styles.fill} />
      </span>
      <div className={styles.inner}>
        {/* blog.google puts the publication mark here. This blog shows the
            story's own cover, which is what readers recognise mid-scroll;
            it falls back to the author avatar, then a monogram. */}
        <Link href={routes.blog} className={styles.brand} aria-label={title} tabIndex={-1} aria-hidden="true">
          {coverUrl || avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl || avatarUrl} alt="" className={styles.avatar} width={42} height={42} />
          ) : (
            <span className={styles.avatarFallback}>
              {(siteName || "B").trim().charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <Link href={routes.blog} className={styles.title}>{title}</Link>
        <span className={styles.actions}>
          <Link href={routes.search} className={styles.iconBtn} aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </Link>
          <ShareMenu title={title} url={shareUrl} compact />
        </span>
      </div>
    </div>,
    document.body,
  );
}
