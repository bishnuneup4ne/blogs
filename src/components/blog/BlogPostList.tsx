"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Sticky side panel with image + summary (off on video tab) */
  showPreview?: boolean;
};

function canHoverPreview() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
}

const HOVER_DELAY_MS = 80;

export function BlogPostList({ items, showPreview = true }: BlogPostListProps) {
  const [active, setActive] = useState<BlogListItem | null>(null);
  const [showDock, setShowDock] = useState(false);
  const [readyImage, setReadyImage] = useState("");
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageCacheRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const dock = showPreview && canHoverPreview();
    setShowDock(dock);
    if (dock && items.length > 0) {
      setActive(items[0]);
    } else {
      setActive(null);
    }
  }, [items, showPreview]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const select = useCallback(
    (item: BlogListItem) => {
      if (!showPreview || !canHoverPreview()) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setActive(item);
      }, HOVER_DELAY_MS);
    },
    [showPreview],
  );

  const preview = active;
  const previewImage = preview?.image ? normalizeImageUrl(preview.image) : "";

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
  }, [previewImage, preview?.slug]);

  return (
    <div className={`${styles.layout} ${!showDock ? styles.layoutSingle : ""}`}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.slug}
            className={styles.item}
            onMouseEnter={() => select(item)}
          >
            <Link
              href={item.href}
              className={`${styles.row} ${active?.slug === item.slug ? styles.rowActive : ""}`}
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

      {showDock && preview && (
        <aside className={styles.dock} aria-label="Post preview">
          <div className={styles.dockInner}>
            <Link href={preview.href} className={styles.dockLink}>
              <p className={styles.dockLabel}>{preview.title}</p>
            </Link>

            <div className={styles.previewMedia}>
              {readyImage ? (
                <Link href={preview.href} className={styles.dockImageLink}>
                  <div className={styles.previewImageWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.previewImage}
                      src={readyImage}
                      alt=""
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </Link>
              ) : (
                <div className={styles.previewPlaceholder}>
                  {previewImage ? "Loading…" : "No image"}
                </div>
              )}
            </div>

            <div className={styles.previewText}>
              {preview.summary ? (
                <p className={styles.previewSummary}>{preview.summary}</p>
              ) : (
                <p className={styles.previewSummaryMuted}>No summary</p>
              )}
            </div>

            <Link href={preview.href} className={styles.readMore}>
              Read post →
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
