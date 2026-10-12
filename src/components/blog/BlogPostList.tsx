"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import styles from "./BlogPostList.module.scss";

export type BlogListItem = {
  slug: string;
  href: string;
  title: string;
  date: string;
  summary?: string;
  image?: string;
  index: number;
};

type BlogPostListProps = {
  items: BlogListItem[];
  /** Show the hover preview tooltip (off on video tab) */
  showPreview?: boolean;
};

const TIP_WIDTH = 360;
const TIP_OFFSET_X = 28;
const TIP_MARGIN = 16;

function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
}

export function BlogPostList({ items, showPreview = true }: BlogPostListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipImgRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<((v: number) => void) | null>(null);
  const yTo = useRef<((v: number) => void) | null>(null);
  const rotTo = useRef<((v: number) => void) | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Set<string>>(new Set());
  const tlRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const visibleRef = useRef(false);
  const lastSlugRef = useRef<string | null>(null);

  const [active, setActive] = useState<BlogListItem | null>(null);
  const [listHover, setListHover] = useState(false);
  const [readyImage, setReadyImage] = useState("");
  const [canHoverState, setCanHoverState] = useState(false);

  useEffect(() => {
    setCanHoverState(canHover());
  }, []);

  const hoverEnabled = showPreview && canHoverState;

  useEffect(() => {
    if (!hoverEnabled || !tipRef.current) return;
    xTo.current = gsap.quickTo(tipRef.current, "x", { duration: 0.5, ease: "power3" });
    yTo.current = gsap.quickTo(tipRef.current, "y", { duration: 0.5, ease: "power3" });
    rotTo.current = gsap.quickTo(tipRef.current, "rotation", { duration: 0.7, ease: "power3" });
    gsap.set(tipRef.current, { autoAlpha: 0, scale: 0.94, rotation: 0, transformOrigin: "center left" });
    return () => {
      xTo.current = null;
      yTo.current = null;
      rotTo.current = null;
    };
  }, [hoverEnabled]);

  useEffect(() => {
    const tip = tipRef.current;
    if (!tip || !hoverEnabled) return;

    const content = tip.querySelectorAll("[data-tip-content]");
    const wasVisible = visibleRef.current;

    if (listHover && active) {
      if (!wasVisible) {
        // Entering the list: place at the cursor, pop the card in, stagger content.
        const p = lastPoint.current;
        const h = tip.offsetHeight || 320;
        let tx = (p?.x ?? 0) + TIP_OFFSET_X;
        if (tx + TIP_WIDTH + TIP_MARGIN > window.innerWidth) tx = (p?.x ?? 0) - TIP_WIDTH - TIP_OFFSET_X;
        let ty = (p?.y ?? 0) - h / 2;
        ty = Math.max(TIP_MARGIN, Math.min(ty, window.innerHeight - h - TIP_MARGIN));

        visibleRef.current = true;
        lastSlugRef.current = active.slug;
        tlRef.current?.kill();
        gsap.set(tip, { x: tx, y: ty });
        const tl = gsap.timeline();
        tl.fromTo(
          tip,
          { autoAlpha: 0, scale: 0.94 },
          { autoAlpha: 1, scale: 1, duration: 0.32, ease: "back.out(1.6)" },
        );
        tl.fromTo(
          content,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.05, ease: "power2.out" },
          0.08,
        );
        tlRef.current = tl;
      } else if (lastSlugRef.current !== active.slug) {
        // Moving to another post while visible: glide stays on, crossfade the content.
        lastSlugRef.current = active.slug;
        tlRef.current?.kill();
        const tl = gsap.timeline();
        tl.to(content, { autoAlpha: 0, y: -6, duration: 0.12, ease: "power1.in" });
        tl.set(content, { y: 10 });
        tl.to(content, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" });
        tlRef.current = tl;
      }
    } else if (wasVisible) {
      // Left the list: fade the card out.
      visibleRef.current = false;
      lastSlugRef.current = null;
      rotTo.current?.(0);
      tlRef.current?.kill();
      tlRef.current = gsap.to(tip, {
        autoAlpha: 0,
        scale: 0.94,
        rotation: 0,
        duration: 0.24,
        ease: "power2.in",
      });
    }
  }, [listHover, active?.slug, hoverEnabled]);

  useEffect(() => {
    if (!tipImgRef.current || !hoverEnabled || !active) return;
    const img = tipImgRef.current.querySelector("img");
    const tween = img
      ? gsap.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out" })
      : null;
    return () => {
      tween?.kill();
    };
  }, [active?.slug, readyImage, hoverEnabled]);

  const previewImage = active?.image ? normalizeImageUrl(active.image) : "";

  useEffect(() => {
    if (!previewImage) {
      setReadyImage("");
      return;
    }
    if (imageCacheRef.current.has(previewImage)) {
      setReadyImage(previewImage);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      imageCacheRef.current.add(previewImage);
      if (!cancelled) setReadyImage(previewImage);
    };
    img.onerror = () => {
      if (!cancelled) setReadyImage("");
    };
    img.src = previewImage;
    return () => {
      cancelled = true;
    };
  }, [previewImage]);

  const moveTip = useCallback(
    (x: number, y: number) => {
      const prev = lastPoint.current;
      lastPoint.current = { x, y };
      if (!tipRef.current || !xTo.current || !yTo.current) return;
      const h = tipRef.current.offsetHeight || 320;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let tx = x + TIP_OFFSET_X;
      if (tx + TIP_WIDTH + TIP_MARGIN > vw) tx = x - TIP_WIDTH - TIP_OFFSET_X;
      let ty = y - h / 2;
      ty = Math.max(TIP_MARGIN, Math.min(ty, vh - h - TIP_MARGIN));
      xTo.current(tx);
      yTo.current(ty);
      if (rotTo.current && prev) {
        const vx = x - prev.x;
        const tilt = Math.max(-9, Math.min(9, vx * 0.5));
        rotTo.current(tilt);
      }
    },
    [],
  );

  const onListMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!hoverEnabled) return;
      moveTip(e.clientX, e.clientY);
    },
    [hoverEnabled, moveTip],
  );

  return (
    <div className={styles.layout}>
      <ul
        ref={listRef}
        className={styles.list}
        onMouseEnter={(e) => {
          if (!hoverEnabled) return;
          lastPoint.current = { x: e.clientX, y: e.clientY };
          setActive((prev) => prev ?? items[0] ?? null);
          setListHover(true);
        }}
        onMouseLeave={() => setListHover(false)}
        onMouseMove={onListMouseMove}
      >
        {items.map((item) => (
          <li key={item.slug} className={styles.item} data-post-row>
            <Link
              href={item.href}
              className={`${styles.row} ${active?.slug === item.slug ? styles.rowActive : ""}`}
              onMouseEnter={() => hoverEnabled && setActive(item)}
              onFocus={() => {
                setActive(item);
                setListHover(true);
              }}
            >
              <span className={styles.index}>{String(item.index).padStart(2, "0")}</span>
              <span className={styles.title}>{item.title}</span>
              <time className={styles.date} dateTime={item.date} suppressHydrationWarning>
                {item.date}
              </time>
            </Link>
          </li>
        ))}
      </ul>

      {hoverEnabled && (
        <div ref={tipRef} className={styles.tooltip} aria-hidden="true">
          {active && (
            <>
              <div ref={tipImgRef} data-tip-content className={styles.tipImageWrap}>
                {readyImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={readyImage}
                    className={styles.tipImage}
                    src={readyImage}
                    alt=""
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={styles.tipImageEmpty}>{previewImage ? "Loading…" : "No image"}</div>
                )}
              </div>
              <p data-tip-content className={styles.tipTitle}>
                {active.title}
              </p>
              <p data-tip-content className={styles.tipSummary}>
                {active.summary || "No summary"}
              </p>
              <span data-tip-content className={styles.tipDate} suppressHydrationWarning>
                {active.date}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
