"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Heading } from "@/lib/types";
import { ChevronDown } from "@/components/icons/Icons";
import styles from "./InThisArticle.module.scss";

export function InThisArticle({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll-spy: the active heading is the last one whose top has passed the
  // header band. Deterministic on every scroll frame — no observer gaps.
  useEffect(() => {
    if (headings.length === 0) return;
    let frame = 0;

    function update() {
      frame = 0;
      const line = 160;
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= line) current = h.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  // Scroll only the TOC list to keep the active row visible —
  // never the page (scrollIntoView would jump the document).
  useEffect(() => {
    const list = listRef.current;
    if (!activeId || !list) return;
    const row = list.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`)?.parentElement;
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTo({ top: top - 8, behavior: "smooth" });
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: bottom - list.clientHeight + 8, behavior: "smooth" });
    }
  }, [activeId]);

  if (headings.length < 2) return null;

  function toggle() {
    const panel = panelRef.current;
    const next = !open;
    setOpen(next);
    if (!panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.style.height = next ? "auto" : "0";
      panel.style.opacity = next ? "1" : "0";
      return;
    }
    if (next) {
      gsap.fromTo(
        panel,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out", onComplete: () => (panel.style.height = "auto") },
      );
    } else {
      gsap.to(panel, { height: 0, opacity: 0, duration: 0.25, ease: "power2.in" });
    }
  }

  return (
    <nav className={styles.wrap} aria-label="In this article">
      <button
        type="button"
        className={styles.pill}
        aria-expanded={open}
        aria-controls="article-toc-panel"
        onClick={toggle}
      >
        <span className={styles.label}>In this article</span>
        <ChevronDown width={18} height={18} className={open ? undefined : styles.chevFlip} />
      </button>

      <div
        id="article-toc-panel"
        ref={panelRef}
        className={open ? styles.panelOpen : styles.panelClosed}
        aria-hidden={!open}
      >
        <hr className={styles.rule} />
        <ul className={styles.list} ref={listRef}>
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={activeId === h.id ? styles.active : undefined}
                tabIndex={open ? undefined : -1}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
