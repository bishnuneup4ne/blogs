"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import styles from "./AlbumGrid.module.scss";

/* hqdefault is padded to 4:3 with black bars; maxresdefault is true 16:9.
   Not every video has a maxres frame, so fall back to the original on error. */
const YT_POSTER = /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{6,20})\/(?:hq|sd|mq)default\.jpg$/;
function bestPoster(src: string): string {
  const match = src.match(YT_POSTER);
  return match ? `https://i.ytimg.com/vi/${match[1]}/maxresdefault.jpg` : src;
}

function youTubeId(raw: string): string | null {
  const m = raw.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  );
  return m ? m[1] : null;
}

export function AlbumGrid({ photos }: { photos: GalleryPhoto[]; count?: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // The first photo is the LCP element on album pages — load it eagerly.
  const firstImageIdx = photos.findIndex((p) => p.kind !== "video");

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
        {photos.map((photo, i) => {
          const videoId = photo.kind === "video" ? youTubeId(photo.src) : null;

          return (
            <li
              key={photo.id}
              className={photo.kind === "video" ? `${styles.cell} ${styles.cellVideo}` : styles.cell}
            >
              {videoId ? (
                <InlineVideo
                  videoId={videoId}
                  poster={photo.poster}
                  caption={photo.caption}
                  takenAt={photo.takenAt}
                  onOpen={() => setOpenIndex(i)}
                />
              ) : (
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
                        <img
                          src={bestPoster(photo.poster)}
                          alt=""
                          className={styles.image}
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallback) return;
                            img.dataset.fallback = "1";
                            img.src = photo.poster!;
                          }}
                        />
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
                        loading={i === firstImageIdx ? "eager" : "lazy"}
                        fetchPriority={i === firstImageIdx ? "high" : undefined}
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
              )}
            </li>
          );
        })}
      </ul>

      {openIndex !== null ? (
        <Lightbox
          images={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}

/* YouTube tile that plays itself once it scrolls into view — muted and
   looping, since browsers block audible autoplay — then pauses the moment it
   leaves the viewport so nothing keeps running off-screen. A click opens the
   full player in the lightbox. */
function InlineVideo({
  videoId,
  poster,
  caption,
  takenAt,
  onOpen,
}: {
  videoId: string;
  poster?: string;
  caption: string;
  takenAt?: string;
  onOpen: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const command = useCallback((func: string) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*",
    );
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setMounted(true);
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    command(visible ? "playVideo" : "pauseVideo");
  }, [visible, mounted, command]);

  // The embed ignores commands until it is listening; re-announce for a while.
  useEffect(() => {
    if (!mounted) return;
    let sent = 0;
    const id = window.setInterval(() => {
      if (++sent > 14) {
        window.clearInterval(id);
        return;
      }
      frameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoId }),
        "*",
      );
    }, 400);
    return () => window.clearInterval(id);
  }, [mounted, videoId]);

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&enablejsapi=1`;

  return (
    <div ref={shellRef} className={`${styles.item} ${styles.itemVideo}`}>
      {mounted ? (
        <iframe
          ref={frameRef}
          src={src}
          title={caption || "Video"}
          className={styles.videoFrame}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          tabIndex={-1}
        />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bestPoster(poster)}
          alt=""
          className={styles.image}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) return;
            img.dataset.fallback = "1";
            img.src = poster;
          }}
        />
      ) : null}

      <button type="button" className={styles.videoHit} onClick={onOpen} aria-label={`Open video: ${caption}`}>
        <span className={styles.overlay}>
          <span className={styles.caption}>{caption}</span>
          {takenAt ? <span className={styles.date}>{formatDate(takenAt)}</span> : null}
        </span>
      </button>
    </div>
  );
}