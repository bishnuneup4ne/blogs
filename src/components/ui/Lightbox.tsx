"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Lightbox.module.scss";

export interface LightboxItem {
  src: string;
  alt: string;
  caption?: string;
  kind?: "image" | "video";
  poster?: string;
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}) {
  const open = index !== null && index >= 0 && index < images.length;
  const image = open ? images[index] : null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const go = useCallback(
    (delta: number) => {
      if (!onIndexChange || index === null) return;
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  const goRef = useRef(go);
  goRef.current = go;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const outside = [
      document.querySelector("header"),
      document.querySelector("main"),
      document.querySelector("footer"),
    ].filter((el): el is HTMLElement => Boolean(el));
    for (const el of outside) el.setAttribute("inert", "");

    const header = document.querySelector("header");
    header?.setAttribute("data-lightbox-hide", "");
    const frame = requestAnimationFrame(() => closeRef.current?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "ArrowRight") {
        goRef.current(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        goRef.current(-1);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      header?.removeAttribute("data-lightbox-hide");
      for (const el of outside) el.removeAttribute("inert");
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!image) return null;

  const navigable = images.length > 1 && Boolean(onIndexChange);

  const dialog = (
    <div ref={dialogRef} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={image.alt}>
      <button type="button" className={styles.scrim} onClick={onClose} aria-label="Close" tabIndex={-1} />

      <div className={styles.topBar}>
        {navigable ? (
          <p className={styles.counter}>
            <span className={styles.counterNow}>{index! + 1}</span>
            <span className={styles.counterSep}>/</span>
            {images.length}
          </p>
        ) : (
          <span />
        )}
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {navigable ? (
        <button type="button" className={`${styles.nav} ${styles.prev}`} onClick={() => go(-1)} aria-label="Previous image">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      ) : null}

      <figure className={styles.frame}>
        {image.kind === "video" ? (
          <video
            key={image.src}
            src={image.src}
            poster={image.poster}
            controls
            autoPlay
            playsInline
            className={styles.media}
            aria-label={image.alt}
            onLoadedData={(e) => e.currentTarget.setAttribute("data-loaded", "")}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.src}
            src={image.src}
            alt={image.alt}
            className={styles.media}
            onLoad={(e) => e.currentTarget.setAttribute("data-loaded", "")}
          />
        )}
        {image.caption ? (
          <figcaption className={styles.caption}>{image.caption}</figcaption>
        ) : null}
      </figure>

      {navigable ? (
        <button type="button" className={`${styles.nav} ${styles.next}`} onClick={() => go(1)} aria-label="Next image">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      ) : null}

      {navigable ? (
        <div className={styles.strip} role="group" aria-label="All frames">
          {images.map((item, i) => (
            <button
              key={item.src}
              type="button"
              aria-current={i === index ? "true" : undefined}
              aria-label={`Frame ${i + 1}`}
              className={i === index ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb}
              onClick={() => onIndexChange?.(i)}
            >
              {item.kind === "video" ? (
                <video src={item.src} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  // Portal to <body>: inside the page tree, ancestor stacking contexts can
  // sink the fixed backdrop below the content it is meant to cover.
  return mounted ? createPortal(dialog, document.body) : dialog;
}
