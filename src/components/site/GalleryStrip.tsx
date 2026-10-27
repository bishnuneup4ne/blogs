"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { GalleryPhoto } from "@/lib/types";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import styles from "./GalleryStrip.module.scss";

/* blog.google-style browse row: one large featured frame plus a swipeable
   strip of recent shots; any click opens the zoomable lightbox. */
interface FolderRef { title: string; slug: string; src: string; count: number }

export function GalleryStrip({ photos, folders = [] }: { photos: GalleryPhoto[]; folders?: FolderRef[] }) {
  const images = photos.filter((p) => p.kind !== "video");
  const [featured, ...rest] = images;
  const trackRef = useRef<HTMLUListElement>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  if (!featured) return null;

  const items: LightboxItem[] = images.map((p) => ({ src: p.src, alt: p.alt, caption: p.caption }));

  const scrollByCards = (dir: -1 | 1) => {
    const t = trackRef.current;
    if (!t) return;
    const first = t.children[0] as HTMLElement | undefined;
    t.scrollBy({ left: ((first?.offsetWidth ?? 240) + 16) * dir * 2, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.featureRow}>
        <button type="button" className={styles.feature} onClick={() => setZoom(0)} aria-label={`Open photo: ${featured.caption || "featured"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.src} alt={featured.alt} className={styles.featureImg} />
          <span className={styles.featureShade} aria-hidden="true">
            <span className={styles.featureCaption}>{featured.caption}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" />
            </svg>
          </span>
        </button>
        <Link href="/gallery" className={`${styles.browseCta} btn btn-ghost`}>
          Browse the gallery
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14m0 0-6-6m6 6-6 6" />
          </svg>
        </Link>
      </div>

      {rest.length > 0 ? (
        <div className={styles.stripWrap}>
          <ul ref={trackRef} className={styles.track}>
            {folders.filter((f) => f.src).map((f) => (
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
            {rest.map((p, i) => (
              <li key={p.id}>
                <button type="button" className={styles.thumb} onClick={() => setZoom(i + 1)} aria-label={`Open photo: ${p.caption || `frame ${i + 2}`}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.arrows}>
            <button type="button" className={styles.arrow} onClick={() => scrollByCards(-1)} aria-label="Earlier photos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button type="button" className={styles.arrow} onClick={() => scrollByCards(1)} aria-label="Later photos">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <Lightbox images={items} index={zoom} onClose={() => setZoom(null)} onIndexChange={setZoom} />
    </div>
  );
}
