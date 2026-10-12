import type { ReactNode } from "react";
import { Column } from "@once-ui-system/core";
import styles from "./ui.module.scss";

type ShellWidth = "wide" | "medium" | "narrow";

const widthVar: Record<ShellWidth, string> = {
  wide: "var(--content-wide)",
  medium: "var(--content-medium)",
  narrow: "var(--content-narrow)",
};

/**
 * Shared public page container — single width token, centered, fade-in.
 * Replaces the old page-shell.module.scss + ad-hoc wrappers.
 */
export function PageShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: ShellWidth;
}) {
  return (
    <Column
      fillWidth
      horizontal="center"
      className={styles.shell}
      style={{ maxWidth: widthVar[width] }}
    >
      {children}
    </Column>
  );
}
