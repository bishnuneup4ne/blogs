"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { classifyVideo, type VideoSource } from "@/lib/external-video";
import styles from "./MediaCarousel.module.scss";

/* blog.google media rail: cards that peek off both edges of the reading
   column, a one-line caption with a round "+" expander under each card, and
   the joined arrow pair with a progress line beneath the strip. Slides can
   mix photos, uploaded clips, YouTube/Vimeo embeds and quote cards. */
export type CarouselSlide =
  | {
      kind: "media";
      src: string;
      alt: string;
      /** Position in the post-wide lightbox gallery; -1 when not zoomable. */
      index: number;
      size?: string;
    }
  | { kind: "quote"; html: string; author?: string; role?: string };

export function MediaCarousel({ slides, onOpen }: { slides: CarouselSlide[]; onOpen: (lightboxIndex: number) => void }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const drag = useRef<{ down: boolean; startX: number; startLeft: number; moved: boolean; imageIdx?: number }>({ down: false, startX: 0, startLeft: 0, moved: false });
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [max, setMax] = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [playing, setPlaying] = useState<Record<number, boolean>>({});

  // The card whose left edge is nearest the current scroll position is the
  // "active" one — this stays true for both paging and free dragging.
  // Cards are positioned relative to the page, not the track, so compare
  // bounding rects rather than offsetLeft.
  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const limit = t.scrollWidth - t.clientWidth;
    setMax(limit);
    setProgress(limit <= 0 ? 1 : Math.min(Math.max(t.scrollLeft / limit, 0), 1));

    const trackLeft = t.getBoundingClientRect().left;
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    const cards = Array.from(t.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((el, i) => {
      // Distance from where this card *should* sit when fully aligned.
      const dist = Math.abs(el.getBoundingClientRect().left - (trackLeft + pad));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(delta: number) {
    const t = trackRef.current;
    if (!t) return;
    const next = Math.min(Math.max(active + delta, 0), Math.max(slides.length - 1, 0));
    const el = t.children[next] as HTMLElement | undefined;
    if (!el) return;
    const trackLeft = t.getBoundingClientRect().left;
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    // Card's left edge is currently this far into the scrollable content.
    const cardStart = el.getBoundingClientRect().left - trackLeft + t.scrollLeft - pad;
    const left = Math.min(Math.max(cardStart, 0), t.scrollWidth - t.clientWidth);
    t.scrollTo({ left, behavior: "smooth" });
  }

  if (slides.length === 0) return null;

  const atStart = active <= 0;
  const atEnd = max > 0 && active >= slides.length - 1;

  return (
    <div className={styles.wrap}>
      <ul
        className={styles.track}
        ref={trackRef}
        onScroll={update}
        onPointerDown={(e) => {
          const t = trackRef.current;
          if (e.pointerType !== "mouse" || !t) return;
          // Right-click drag to move image
          if (e.button !== 0) {
            drag.current = { down: true, startX: e.clientX, startLeft: t.scrollLeft, moved: false, imageIdx: active };
            t.classList.add(styles.dragging);
            const move = (ev: PointerEvent) => {
              if (!trackRef.current || !drag.current?.down) return;
              const dx = ev.clientX - drag.current.startX;
              if (Math.abs(dx) > 4) {
                drag.current.moved = true;
                trackRef.current.scrollLeft = drag.current.startLeft - dx;
                const img = t.querySelector<HTMLElement>(`.${styles.tile}[data-index="${drag.current.imageIdx}"]`);
                if (img) {
                  img.style.transition = "none";
                  img.style.transform = `translate3d(${dx}px, 0, 0)`;
                }
              }
            };
            const up = () => {
              drag.current.down = false;
              trackRef.current && trackRef.current.classList.remove(styles.dragging);
              if (drag.current.moved && trackRef.current) {
                trackRef.current.scrollLeft = drag.current.startLeft;
                const img = t.querySelector<HTMLElement>(`.${styles.tile}[data-index="${drag.current.imageIdx}"]`);
                if (img) img.style.transform = "";
              }
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
            drag.current.imageIdx = active;
            return;
          }
          const start = { down: true, startX: e.clientX, startLeft: t.scrollLeft, moved: false };
          drag.current = start;
          t.classList.add(styles.dragging);
          const move = (ev: PointerEvent) => {
            if (!trackRef.current || !start.down) return;
            const dx = ev.clientX - start.startX;
            if (Math.abs(dx) > 4) {
              start.moved = true;
              trackRef.current.scrollLeft = start.startLeft - dx;
            }
          };
          const up = () => {
            start.down = false;
            trackRef.current?.classList.remove(styles.dragging);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
          }
          drag.current.moved = false;
        }}
      >
        {slides.map((slide, i) => (
          <li key={i} className={styles.item}>
            {slide.kind === "quote" ? (
              <figure className={styles.quoteTile} aria-label={slide.author ? `Quote from ${slide.author}` : undefined}>
                <blockquote className={styles.quoteText} dangerouslySetInnerHTML={{ __html: slide.html }} />
                {slide.author || slide.role ? (
                  <figcaption className={styles.quoteBy}>
                    {slide.author ? <span className={styles.quoteAuthor}>{slide.author}</span> : null}
                    {slide.role ? <span className={styles.quoteRole}>{slide.role}</span> : null}
                  </figcaption>
                ) : null}
              </figure>
            ) : (
              <MediaTile
                src={slide.src}
                alt={slide.alt}
                size={slide.size}
                playing={Boolean(playing[i])}
                onPlay={() => setPlaying((p) => ({ ...p, [i]: true }))}
                onPause={() => setPlaying((p) => ({ ...p, [i]: false }))}
                onZoom={() => slide.index >= 0 && onOpen(slide.index)}
              />
            )}

            {slide.kind === "media" && slide.alt ? (
              <div className={styles.captionRow}>
                <p className={expanded[i] ? `${styles.caption} ${styles.captionOpen}` : styles.caption}>
                  {slide.alt}
                </p>
                <button
                  type="button"
                  className={expanded[i] ? `${styles.expand} ${styles.expandOpen}` : styles.expand}
                  onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                  aria-expanded={Boolean(expanded[i])}
                  aria-label={expanded[i] ? "Show less" : "Show more"}
                  title={expanded[i] ? "Show less" : "Show more"}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    {expanded[i] ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
                  </svg>
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {slides.length > 1 ? (
        <div className={styles.controls}>
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(-1)}
              disabled={atStart}
              aria-label="Previous slide"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label="Next slide"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
          <span className={styles.progress} aria-hidden="true">
            <span className={styles.progressFill} style={{ transform: `scaleX(${Math.max(progress, 0.1)})` }} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

function MediaTile({
  src,
  alt,
  size,
  playing,
  onPlay,
  onPause,
  onZoom,
}: {
  src: string;
  alt: string;
  size?: string;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onZoom: () => void;
}) {
  const video: VideoSource | null = classifyVideo(src);
  const sizeClass = size === "portrait" ? styles.tilePortrait : size === "square" ? styles.tileSquare : size === "wide" ? styles.tileWide : "";

  if (video?.kind === "file") {
    return (
      <div className={styles.tile}>
        <video
          src={src}
          playsInline
          preload="metadata"
          controls={playing}
          loop
          className={styles.img}
          onPlay={onPlay}
          onPause={onPause}
          aria-label={alt}
        />
        {!playing ? (
          <button
            type="button"
            className={styles.videoPlay}
            onClick={(e) => {
              (e.currentTarget.parentElement?.querySelector("video") as HTMLVideoElement | null)?.play();
            }}
            aria-label={`Play video: ${alt}`}
          >
            <PlayGlyph />
          </button>
        ) : null}
      </div>
    );
  }

  if (video) {
    // Provider embeds play in place — a bare <a> navigated away instead.
    return (
      <div className={`${styles.tile} ${styles.embedTile} ${sizeClass}`}>
        {playing ? (
          <iframe
            src={video.embedSrc}
            title={alt || "Video"}
            className={styles.embed}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className={styles.embedCover}
            onClick={onPlay}
            aria-label={`Play ${video.kind === "youtube" ? "YouTube" : "Vimeo"} video: ${alt}`}
          >
            {video.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.poster} alt="" loading="lazy" className={styles.img} />
            ) : null}
            <span className={styles.videoPlay} aria-hidden="true">
              <PlayGlyph />
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button type="button" className={`${styles.tile} ${sizeClass}`} onClick={onZoom} aria-label={`Zoom image: ${alt}`}>
      <Image src={src} alt={alt} fill sizes="60vw" className={styles.img} />
    </button>
  );
}
