"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import styles from "./AlbumGrid.module.scss";

export function AlbumGrid({ photos }: { photos: GalleryPhoto[]; count?: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items: LightboxItem[] = photos.map((p) => ({
    src: p.src,
    alt: p.alt,
    caption: `${p.caption}${p.takenAt ? ` · ${formatDate(p.takenAt)}` : ""}`,
    kind: p.kind,
    poster: p.poster,
  }));

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li key={photo.id} className={styles.cell}>
            <button
              type="button"
              className={styles.item}
              onClick={() => setOpenIndex(i)}
              aria-label={
                photo.kind === "video" ? `Play video: ${photo.caption}` : `Open photo: ${photo.caption}`
              }
            >
              <span className={styles.media}>
                {photo.kind === "video" ? (
                  photo.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.poster} alt="" className={styles.image} loading="lazy" />
                  ) : (
                    <span className={`${styles.image} ${styles.videoPlaceholder}`} aria-hidden="true">▶</span>
                  )
                ) : (
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    loading="lazy"
                    className={styles.image}
                  />
                )}
              </span>

              {photo.kind === "video" ? (
                <span className={styles.playBadge} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                </span>
              ) : null}

              <span className={styles.overlay} aria-hidden="true">
                <span className={styles.caption}>{photo.caption}</span>
                {photo.takenAt ? <span className={styles.date}>{formatDate(photo.takenAt)}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox images={items} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
    </>
  );
}