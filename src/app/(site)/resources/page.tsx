import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { resourceGroups } from "@/content/resources";
import { routes } from "@/lib/routes";
import styles from "./resources.module.scss";

const description =
  "The books, courses, videos and references behind the articles — grouped by field, with a note on why each one is worth your time.";

export const metadata: Metadata = {
  title: "Resources",
  description,
  alternates: { canonical: "/resources" },
  openGraph: { url: "/resources", title: "Resources", description },
};

export default function ResourcesPage() {
  const total = resourceGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <article className={styles.page}>
      <Breadcrumb items={[{ label: "Home", href: routes.home }, { label: "Resources" }]} />

      <header className={styles.head}>
        <h1 className={styles.title}>Resources</h1>
        <p className={styles.lede}>
          Everything I cite in an article, collected in one place: {total} books, courses, videos and
          references across {resourceGroups.length} fields. Each one is here because I actually used it.
        </p>
        <nav className={styles.jump} aria-label="Jump to a field">
          {resourceGroups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className={styles.jumpChip}>
              {g.title}
            </a>
          ))}
        </nav>
      </header>

      {resourceGroups.map((group) => (
        <section key={group.id} id={group.id} className={styles.section} aria-labelledby={`${group.id}-title`}>
          <div className={styles.sectionHead}>
            <h2 id={`${group.id}-title`} className={styles.sectionTitle}>
              {group.title}
            </h2>
            <p className={styles.sectionLede}>{group.lede}</p>
          </div>

          <ul className={styles.list}>
            {group.items.map((item) => (
              <li key={item.href} className={styles.item}>
                <a href={item.href} className={styles.itemLink} target="_blank" rel="noreferrer noopener">
                  <span className={styles.itemTop}>
                    <span className={styles.kind} data-kind={item.kind}>
                      {item.kind}
                    </span>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.arrow} aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </span>
                  {item.by ? <span className={styles.by}>{item.by}</span> : null}
                  <span className={styles.note}>{item.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className={styles.foot}>
        <p>
          Looking for the series these support? Start with{" "}
          <Link href={routes.series("hardware-handbook")}>the Hardware Handbook</Link>.
        </p>
      </footer>
    </article>
  );
}
