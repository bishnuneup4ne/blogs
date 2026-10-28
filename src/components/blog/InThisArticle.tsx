"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Heading } from "@/lib/types";
import { ChevronDown } from "@/components/icons/Icons";
import styles from "./InThisArticle.module.scss";

export function InThisArticle({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const [open, setOpen] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  /* Fold while a photo, reel or player scrolls behind the sticky rail, then
     reopen once it has passed. Hashing makes CSS-module class names useless
     as selectors, so match the elements themselves.

     Two things keep it from flickering:
     - The test band is the *pill*, never the open panel. Measuring the panel
       meant opening it made it collide with media sooner, which collapsed it,
       which shrank the band and reopened it — a visible loop.
     - Hysteresis: media must clear the pill by 16px before it reopens, so a
       photo resting exactly on the boundary can't toggle it every frame. */
  useEffect(() => {
    if (userToggled) return;
    let frame = 0;
    let folded = false;
    function update() {
      frame = 0;
      const nav = wrapRef.current;
      const pill = pillRef.current;
      if (!nav || !pill) return;
      const top = pill.getBoundingClientRect().top;
      const bottom = top + pill.getBoundingClientRect().height;
      const clip = nav.parentElement?.getBoundingClientRect() ?? nav.getBoundingClientRect();
      const left = Math.max(pill.getBoundingClientRect().left, clip.left);
      const right = Math.min(pill.getBoundingClientRect().right, clip.right);

      let overlapsBand = false;
      const media = document.querySelectorAll<HTMLElement>("figure, iframe, video");
      for (const el of media) {
        const r = el.getBoundingClientRect();
        if (r.right > left && r.left < right && r.bottom > top && r.top < bottom) {
          overlapsBand = true;
          break;
        }
      }

      // Enter the fold as soon as they touch; leave only once clearly clear.
      if (!folded && overlapsBand) folded = true;
      else if (folded && !overlapsBand) {
        let stillNear = false;
        for (const el of media) {
          const r = el.getBoundingClientRect();
          if (r.right > left && r.left < right && r.bottom > top - 16 && r.top < bottom + 16) {
            stillNear = true;
            break;
          }
        }
        if (!stillNear) folded = false;
      }

      setOpen((prev) => (prev === !folded ? prev : !folded));
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
  }, [userToggled]);

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
    // A manual toggle wins for the rest of the visit, so auto-folding can't
    // fight the reader on the next photo.
    setUserToggled(true);
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
    <nav ref={wrapRef} className={styles.wrap} aria-label="In this article">
      <button
        ref={pillRef}
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
