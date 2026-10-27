"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./GalleryStrip.module.scss";

/* Folder-cover carousel: three tiles visible, arrows page through the rest. */
interface FolderRef { title: string; slug: string; src: string; count: number }

export function GalleryStrip({ folders = [] }: { folders: FolderRef[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [pages, setPages] = useState({ atStart: true, atEnd: true });
  const shown = folders.filter((f) => f.src);
  if (shown.length === 0) return null;

  const updateEdges = () => {
    const t = trackRef.current;
    if (!t) return;
    setPages({
      atStart: t.scrollLeft <= 4,
      atEnd: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateEdges();
  }, [shown.length]);

  const scrollByCards = (dir: -1 | 1) => {
    const t = trackRef.current;
    if (!t) return;
    /* step exactly one tile so 3 stay visible between clicks */
    const first = t.children[0] as HTMLElement | undefined;
    t.scrollBy({ left: ((first?.offsetWidth ?? 240) + 14) * dir, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.stripWrap}>
        <ul ref={trackRef} onScroll={updateEdges} className={styles.track}>
          {shown.map((f) => (
            <li key={`folder-${f.slug}`} className={styles.slide}>
              <Link href={`/gallery/${f.slug}`} className={styles.folderTile} aria-label={`Open folder: ${f.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt="" loading="lazy" />
                <span className={styles.folderLabel}>
                  <strong>{f.title}</strong>
                  <em>{f.count} photos</em>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scrollByCards(-1)} disabled={pages.atStart} aria-label="Earlier folders">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollByCards(1)} disabled={pages.atEnd} aria-label="Later folders">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
