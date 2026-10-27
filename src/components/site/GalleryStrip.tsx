"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import styles from "./GalleryStrip.module.scss";

/* Folder-cover carousel: one tile per gallery folder, arrows to scroll. */
interface FolderRef { title: string; slug: string; src: string; count: number }

export function GalleryStrip({ folders = [] }: { folders: FolderRef[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const shown = folders.filter((f) => f.src);
  if (shown.length === 0) return null;

  const scrollByCards = (dir: -1 | 1) => {
    const t = trackRef.current;
    if (!t) return;
    const first = t.children[0] as HTMLElement | undefined;
    t.scrollBy({ left: ((first?.offsetWidth ?? 240) + 16) * dir * 2, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.stripWrap}>
        <ul ref={trackRef} className={styles.track}>
          {shown.map((f) => (
            <li key={`folder-${f.slug}`}>
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
          <button type="button" className={styles.arrow} onClick={() => scrollByCards(-1)} aria-label="Earlier folders">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollByCards(1)} aria-label="Later folders">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
