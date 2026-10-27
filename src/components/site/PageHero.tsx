import type { ReactNode } from "react";
import styles from "./PageHero.module.scss";

/* Shared page masthead: blue kicker over a big statement headline, with an
   optional slot for CTAs or a form. Matches the homepage hero language. */
export function PageHero({
  kicker,
  title,
  lede,
  align = "center",
  children,
}: {
  kicker?: string;
  title: ReactNode;
  lede: string;
  align?: "center" | "start";
  children?: ReactNode;
}) {
  return (
    <div className={align === "start" ? `${styles.hero} ${styles.start}` : styles.hero}>
      {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lede}>{lede}</p>
      {children ? <div className={styles.slot}>{children}</div> : null}
    </div>
  );
}