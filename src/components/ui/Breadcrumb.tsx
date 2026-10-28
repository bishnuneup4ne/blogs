import Link from "next/link";
import styles from "./Breadcrumb.module.scss";

export interface Crumb {
  label: string;
  href?: string;
}

/* One breadcrumb for every page: blue ancestors, grey current page, a thin
   chevron between each step. Pages pass the trail from Home downward. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav className={className ? `${styles.crumbs} ${className}` : styles.crumbs} aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`}>
              {i > 0 ? (
                <svg className={styles.sep} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : null}
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
