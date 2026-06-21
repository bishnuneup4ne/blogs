"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./VideoList.module.scss";

type VideoPanelBodyProps = {
  content: string;
};

/** Optional video notes / description from admin. */
export function VideoPanelBody({ content }: VideoPanelBodyProps) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  return (
    <section className={styles.panelSection} aria-label="Description">
      <h4 className={styles.panelSectionTitle}>Description</h4>
      <div className={styles.panelMarkdown}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
      </div>
    </section>
  );
}
