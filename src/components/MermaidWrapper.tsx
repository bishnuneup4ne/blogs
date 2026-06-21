"use client";

import dynamic from "next/dynamic";
import styles from "./MermaidChart.module.scss";

function MermaidPlaceholder() {
  return (
    <figure className={styles.box} aria-hidden>
      <div className={styles.inner} />
      <p className={styles.loading}>Loading diagram…</p>
    </figure>
  );
}

/** Mermaid must not SSR — avoids hydration mismatches on diagram shells. */
export const MermaidWrapper = dynamic(
  () => import("./MermaidChart").then((mod) => mod.MermaidChart),
  { ssr: false, loading: () => <MermaidPlaceholder /> },
);
