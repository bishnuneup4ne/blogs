"use client";

import { useState } from "react";
import styles from "./PostContent.module.scss";

export type FaqItem = { q: string; html: string };

/**
 * Accordion where opening one row closes the rest. Native <details> allows any
 * number open at once, so the open row is held in state instead.
 */
export function FaqList({ items, variant, title }: { items: FaqItem[]; variant?: string; title?: string }) {
  // First question opens by default so the section never reads as dead space.
  const [open, setOpen] = useState<number | null>(items.length ? 0 : null);

  function toggle(i: number) {
    setOpen((current) => (current === i ? null : i));
  }

  return (
    <section
      className={`${styles.faq} ${variant ? styles[`acc-${variant}`] : ""}`}
      aria-label={title || "Questions"}
    >
      <header className={styles.faqHead}>
        <h2 className={styles.faqTitle}>{title?.trim() || "Frequently asked questions"}</h2>
      </header>
      <div className={styles.faqList}>
        {items.map((item, i) => {
          const isOpen = open === i;
          const panelId = `faq-panel-${i}`;
          const buttonId = `faq-btn-${i}`;
          return (
            <div key={i} className={isOpen ? `${styles.faqItem} ${styles.faqItemOpen}` : styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                <button
                  type="button"
                  id={buttonId}
                  className={styles.faqQ}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(i)}
                >
                  <span className={styles.faqQText}>{item.q}</span>
                  <span className={styles.faqIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={isOpen ? styles.faqBodyOpen : styles.faqBody}
                hidden={!isOpen}
              >
                <div className={styles.faqA} dangerouslySetInnerHTML={{ __html: item.html }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
