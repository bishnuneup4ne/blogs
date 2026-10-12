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

const TIP_WIDTH = 320;
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
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const imageCacheRef = useRef<Set<string>>(new Set());

  const [active, setActive] = useState<BlogListItem | null>(null);
  const [readyImage, setReadyImage] = useState("");

  const hoverEnabled = showPreview && canHover();

  useEffect(() => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll("[data-post-row]");
    const tween = gsap.fromTo(
      rows,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power2.out" },
    );
    return () => {
      tween.revert();
    };
  }, [items]);

  useEffect(() => {
    if (!tipRef.current) return;
    xTo.current = gsap.quickTo(tipRef.current, "x", { duration: 0.4, ease: "power3" });
    yTo.current = gsap.quickTo(tipRef.current, "y", { duration: 0.4, ease: "power3" });
    gsap.set(tipRef.current, { autoAlpha: 0, scale: 0.96 });
  }, []);

  useEffect(() => {
    if (!tipRef.current) return;
    if (active) {
      gsap.to(tipRef.current, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "power2.out" });
    } else {
      gsap.to(tipRef.current, { autoAlpha: 0, scale: 0.96, duration: 0.2, ease: "power2.in" });
    }
  }, [active?.slug]);

  useEffect(() => {
    if (tipImgRef.current && active) {
      gsap.fromTo(
        tipImgRef.current,
        { scale: 1.08 },
        { scale: 1, duration: 0.6, ease: "power3.out" },
      );
    }
  }, [active?.slug, readyImage]);

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
        onMouseLeave={() => setActive(null)}
        onMouseMove={onListMouseMove}
      >
        {items.map((item) => (
          <li key={item.slug} className={styles.item} data-post-row>
            <Link
              href={item.href}
              className={`${styles.row} ${active?.slug === item.slug ? styles.rowActive : ""}`}
              onMouseEnter={() => hoverEnabled && setActive(item)}
              onFocus={() => setActive(item)}
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
              <div className={styles.tipImageWrap} ref={tipImgRef}>
                {readyImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
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
              <p className={styles.tipTitle}>{active.title}</p>
              <p className={styles.tipSummary}>
                {active.summary || "No summary"}
              </p>
              <span className={styles.tipDate} suppressHydrationWarning>
                {active.date}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
