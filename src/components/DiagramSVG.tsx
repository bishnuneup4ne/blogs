"use client";

import type { ReactNode } from "react";
import styles from "./DiagramSVG.module.scss";

interface DiagramSVGProps {
  children: ReactNode;
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Wrapper component for embedded SVG diagrams.
 * Accepts raw SVG content as children.
 */
export function DiagramSVG({ children, title, width, height }: DiagramSVGProps) {
  return (
    <figure className={styles.box}>
      <div className={styles.inner} style={{ width, height }}>
        {children}
      </div>
      {title && <figcaption className={styles.caption}>{title}</figcaption>}
    </figure>
  );
}
