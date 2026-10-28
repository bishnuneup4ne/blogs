"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.scss";

/* Every open dialog joins one stack, so Escape and Tab only affect the
   topmost popup (an edit sheet + a confirm, for example). */
let nextDialogId = 0;
const dialogStack: number[] = [];

export function AdminDialog({
  title,
  children,
  footer,
  footerStart,
  onClose,
  variant = "modal",
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerStart?: React.ReactNode;
  onClose: () => void;
  variant?: "panel" | "modal";
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const idRef = useRef(0);
  closeRef.current = onClose;
  if (!idRef.current) idRef.current = ++nextDialogId;

  useEffect(() => {
    const id = idRef.current;
    dialogStack.push(id);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (dialogStack[dialogStack.length - 1] !== id) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

    const active = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const target =
        bodyRef.current?.querySelector<HTMLElement>(
          "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], button:not([disabled])",
        ) ?? panelRef.current?.querySelector<HTMLElement>("button:not([disabled])");
      target?.focus();
    });

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      const index = dialogStack.indexOf(id);
      if (index >= 0) dialogStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      active?.focus?.();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`${styles.overlay} ${variant === "panel" ? styles.end : styles.center}`}>
      <button type="button" className={styles.backdrop} aria-label="Close dialog" tabIndex={-1} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${variant === "panel" ? styles.panel : styles.modal}${wide ? ` ${styles.wide}` : ""}`}
      >
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className={styles.body} ref={bodyRef}>{children}</div>
        {footer || footerStart ? (
          <footer className={styles.foot}>
            {footerStart ? <div className={styles.footStart}>{footerStart}</div> : null}
            {footer ? <div className={styles.footEnd}>{footer}</div> : null}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
