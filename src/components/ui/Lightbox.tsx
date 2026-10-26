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

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
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
  const isVideo = image?.kind === "video";
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLElement | null>(null);  const [mounted, setMounted] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [, setScaleTick] = useState(0);

  // Pointer bookkeeping for pinch / double-tap / drag-pan / swipe-to-close.
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "none" | "pan" | "pinch" | "swipe"; startX: number; startY: number; startScale: number; startDist: number; midX: number; midY: number }>({
    kind: "none", startX: 0, startY: 0, startScale: 1, startDist: 0, midX: 0, midY: 0,
  });
  const lastTap = useRef(0);

  useEffect(() => setMounted(true), []);

  const apply = useCallback(() => {
    const el = mediaRef.current;
    const { scale, x, y } = view.current;
    if (el) {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      el.style.transition = gesture.current.kind === "none" ? "" : "none";
    }
    setZoomed(scale > 1.02);
  }, []);

  const reset = useCallback(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    const el = mediaRef.current;
    if (el) {
      el.style.transition = "transform 260ms cubic-bezier(0.2, 0, 0, 1)";
      el.style.transform = "translate3d(0, 0, 0) scale(1)";
    }
    setZoomed(false);
  }, []);

  const setScale = useCallback((next: number, cx?: number, cy?: number) => {
    const prev = view.current.scale;
    const scale = clamp(next, MIN_SCALE, MAX_SCALE);
    const rect = mediaRef.current?.getBoundingClientRect();
    if (rect && cx !== undefined && cy !== undefined) {
      const ox = cx - (rect.left + rect.width / 2);
      const oy = cy - (rect.top + rect.height / 2);
      view.current.x -= ox * (scale / prev - 1);
      view.current.y -= oy * (scale / prev - 1);
    }
    if (scale === 1) {
      view.current.x = 0;
      view.current.y = 0;
    } else {
      const frame = stageRef.current?.getBoundingClientRect();
      if (frame && mediaRef.current) {
        const natW = mediaRef.current.offsetWidth;
        const natH = mediaRef.current.offsetHeight;
        view.current.x = clamp(view.current.x, -Math.max(0, (natW * scale - frame.width) / 2), Math.max(0, (natW * scale - frame.width) / 2));
        view.current.y = clamp(view.current.y, -Math.max(0, (natH * scale - frame.height) / 2), Math.max(0, (natH * scale - frame.height) / 2));
      }
    }
    view.current.scale = scale;
    setScaleTick((t) => t + 1);
    apply();
  }, [apply]);

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
    reset();
  }, [index, reset]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const outside = [
      document.querySelector("main"),
      document.querySelector("footer"),
    ].filter((el): el is HTMLElement => Boolean(el));
    for (const el of outside) el.setAttribute("inert", "");

    const frame = requestAnimationFrame(() => closeRef.current?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        setScaleLocal(1.5);
        return;
      }
      if (event.key === "-") {
        setScaleLocal(1 / 1.5);
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

    function setScaleLocal(factor: number) {
      const next = clamp(view.current.scale * factor, MIN_SCALE, MAX_SCALE);
      view.current.scale = next;
      if (next === 1) {
        view.current.x = 0;
        view.current.y = 0;
      }
      apply();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      for (const el of outside) el.removeAttribute("inert");
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, apply]);

  function stagePointerDown(e: React.PointerEvent) {
    if (isVideo) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: "pinch",
        startX: 0, startY: 0,
        startScale: view.current.scale,
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      return;
    }

    // Single pointer: decide between pan (when zoomed) and swipe-to-close.
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      if (view.current.scale > 1.02) reset();
      else setScale(2.2, e.clientX, e.clientY);
      gesture.current = { ...gesture.current, kind: "none" };
      return;
    }
    lastTap.current = now;
    gesture.current = {
      kind: view.current.scale > 1.02 ? "pan" : "swipe",
      startX: e.clientX,
      startY: e.clientY,
      startScale: view.current.scale,
      startDist: 0,
      midX: 0,
      midY: 0,
    };
  }

  function stagePointerMove(e: React.PointerEvent) {
    if (isVideo || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setScale(g.startScale * (dist / g.startDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (g.kind === "pan") {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      g.startX = e.clientX;
      g.startY = e.clientY;
      view.current.x += dx;
      view.current.y += dy;
      apply();
      return;
    }
    if (g.kind === "swipe") {
      const dy = e.clientY - g.startY;
      const el = mediaRef.current;
      if (el && Math.abs(dy) > 8) {
        el.style.transition = "none";
        el.style.transform = `translate3d(0, ${dy}px, 0) scale(${Math.max(0.9, 1 - Math.abs(dy) / 2400)})`;
      }
    }
  }

  function stagePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g.kind === "swipe") {
      const dy = e.clientY - g.startY;
      if (Math.abs(dy) > 90) {
        onClose();
        return;
      }
      reset();
    }
    if (g.kind === "pinch" && pointers.current.size > 0) return;
    gesture.current = { ...g, kind: "none" };
    if (view.current.scale <= 1.02) reset();
  }

  function stageWheel(e: React.WheelEvent) {
    if (isVideo) return;
    if (e.ctrlKey) e.preventDefault();
    setScale(view.current.scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY);
  }

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
        {!isVideo ? (
          <div className={styles.zoomControls}>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setScale(view.current.scale / 1.5)}
              disabled={zoomed === false && view.current.scale <= 1}
              aria-label="Zoom out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button type="button" className={styles.zoomBtn} onClick={reset} aria-label="Reset zoom">
              <span className={styles.zoomPct}>{Math.round(view.current.scale * 100)}%</span>
            </button>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setScale(view.current.scale * 1.5)}
              aria-label="Zoom in"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        ) : null}
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

      <figure
        ref={stageRef}
        className={zoomed ? `${styles.frame} ${styles.frameZoomed}` : styles.frame}
        onPointerDown={stagePointerDown}
        onPointerMove={stagePointerMove}
        onPointerUp={stagePointerUp}
        onPointerCancel={stagePointerUp}
        onWheel={stageWheel}
      >
        {isVideo ? (
          <video
            key={image.src}
            ref={(node) => { mediaRef.current = node; }}
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
            ref={(node) => { mediaRef.current = node; }}
            src={image.src}
            alt={image.alt}
            draggable={false}
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
