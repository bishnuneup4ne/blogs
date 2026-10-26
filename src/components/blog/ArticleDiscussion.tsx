"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Comments } from "./Comments";
import styles from "./ArticleDiscussion.module.scss";

interface Counts {
  likes: number;
  dislikes: number;
  available?: boolean;
}

const CHOICE_KEY = (slug: string) => `reaction:${slug}`;

export function ArticleDiscussion({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [choice, setChoice] = useState<"like" | "dislike" | null>(null);
  const likeRef = useRef<HTMLButtonElement>(null);
  const dislikeRef = useRef<HTMLButtonElement>(null);
  const likeNumRef = useRef<HTMLSpanElement>(null);
  const dislikeNumRef = useRef<HTMLSpanElement>(null);
  const likeBurstRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const bump = (kind: "likes" | "dislikes") => {
    const el = kind === "likes" ? likeNumRef.current : dislikeNumRef.current;
    if (!el) return;
    gsap.fromTo(el, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(2)" });
  };

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/reactions?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as Counts | null;
      if (data) setCounts({ likes: Number(data.likes) || 0, dislikes: Number(data.dislikes) || 0 });
    } catch {
      /* counts stay hidden */
    }
  }, [slug]);

  useEffect(() => {
    void loadCounts();
    try {
      const saved = localStorage.getItem(CHOICE_KEY(slug));
      if (saved === "like" || saved === "dislike") setChoice(saved);
    } catch {
      /* storage blocked */
    }
  }, [slug, loadCounts]);

  async function react(kind: "like" | "dislike") {
    const prevChoice = choice;
    const prevCounts = counts;
    const next = kind === "like" ? (choice === "like" ? null : "like") : (choice === "dislike" ? null : "dislike");
    setChoice(next);
    // Optimistic count so the number climbs the instant you click.
    if (prevCounts) {
      const delta = (next === "like" ? 1 : 0) - (prevChoice === "like" ? 1 : 0);
      const ddelta = (next === "dislike" ? 1 : 0) - (prevChoice === "dislike" ? 1 : 0);
      if (delta !== 0) bump("likes");
      if (ddelta !== 0) bump("dislikes");
      setCounts({ ...prevCounts, likes: prevCounts.likes + delta, dislikes: prevCounts.dislikes + ddelta });
    }
    const btn = kind === "like" ? likeRef.current : dislikeRef.current;
    if (btn && next) {
      if (kind === "like") {
        // YouTube-ish: squash, spring back, and puff a blue burst.
        gsap.fromTo(btn, { scale: 0.84 }, { scale: 1, duration: 0.6, ease: "elastic.out(1.3, 0.45)" });
        if (likeBurstRef.current) {
          gsap.fromTo(
            likeBurstRef.current,
            { scale: 0.2, opacity: 0.9 },
            { scale: 1.9, opacity: 0, duration: 0.7, ease: "power2.out" },
          );
        }
      } else {
        // Dislike reads as a reluctant, droopy shake.
        gsap.fromTo(
          btn,
          { rotate: 0, y: 0 },
          { rotate: -10, y: 2, duration: 0.16, yoyo: true, repeat: 3, ease: "power2.inOut", clearProps: "rotate,y" },
        );
        const icon = btn.querySelector("svg");
        if (icon) gsap.fromTo(icon, { y: -3 }, { y: 0, duration: 0.5, ease: "bounce.out(1.4)" });
      }
    }
    try {
      const res = await fetch("/api/comments/reactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, value: next }),
      });
      const data = (await res.json().catch(() => null)) as Counts | null;
      if (data && res.ok) {
        setCounts({ likes: Number(data.likes) || 0, dislikes: Number(data.dislikes) || 0 });
        if (next) localStorage.setItem(CHOICE_KEY(slug), next);
        else localStorage.removeItem(CHOICE_KEY(slug));
      } else if (!res.ok) {
        // Server rejected it — roll the optimistic bump back.
        setChoice(prevChoice);
        setCounts(prevCounts);
      }
    } catch {
      /* optimistic state stands until a reload */
    }
  }

  // Slide-in / fade-out for the drawer.
  useEffect(() => {
    if (!open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) return;
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(panelRef.current, { x: "100%" }, { x: 0, duration: 0.45, ease: "power3.out" });
    }, layerRef);
    document.body.style.overflow = "hidden";
    // Focus is deferred to the panel itself (see below); focusing an off-panel
    // control here would make the browser scroll the page.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    // Focus the panel container (preventScroll) — not an off-panel button —
    // so nothing triggers a scroll jump when the drawer opens.
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => {
      ctx.revert();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className={styles.bar}>
        <button
          ref={likeRef}
          type="button"
          className={`${styles.pill} ${choice === "like" ? styles.activeLike : ""}`}
          onClick={(e) => {
            // Without this, the click bubbles to document.body and the header's
            // MutationObserver re-renders mid-animation, snapping scroll.
            e.currentTarget.blur();
            void react("like");
          }}
          aria-pressed={choice === "like"}
        >
          <span ref={likeBurstRef} className={styles.burst} aria-hidden="true" />
          <svg width="18" height="18" viewBox="0 0 24 24" fill={choice === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          <span ref={likeNumRef} className={styles.count}>{counts ? `${counts.likes} Like` : "Like"}</span>
        </button>
        <button
          ref={dislikeRef}
          type="button"
          className={`${styles.pill} ${choice === "dislike" ? styles.activeDislike : ""}`}
          onClick={(e) => {
            e.currentTarget.blur();
            void react("dislike");
          }}
          aria-pressed={choice === "dislike"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={choice === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
          </svg>
          <span ref={dislikeNumRef} className={styles.count}>{counts ? `${counts.dislikes} Dislike` : "Dislike"}</span>
        </button>
        <button type="button" className={styles.commentBtn} onClick={(e) => { e.currentTarget.blur(); setOpen(true); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comments
        </button>
      </div>

      {open
        ? createPortal(
            <div ref={layerRef} className={styles.layer} role="dialog" aria-modal="true" aria-label="Comments">
              <button ref={backdropRef} type="button" className={styles.backdrop} onClick={() => setOpen(false)} aria-label="Close comments" tabIndex={-1} />
              <aside ref={panelRef} className={styles.panel} tabIndex={-1}>
                <header className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>Comments</h2>
                  <button ref={closeRef} type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </header>
                <p className={styles.panelNote}>Moderated — useful and kind, no link drops.</p>
                <div className={styles.panelBody}>
                  <Comments slug={slug} embedded />
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
