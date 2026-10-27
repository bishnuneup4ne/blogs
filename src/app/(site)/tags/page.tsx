import type { Metadata } from "next";
import Link from "next/link";
import { allTags } from "@/lib/data";
import { PageHero } from "@/components/site/PageHero";
import styles from "./tags.module.scss";

export const metadata: Metadata = {
  title: "Tags",
  description: "Every tag across the archive.",
  alternates: { canonical: "/tags" },
  openGraph: { url: "/tags", title: "Tags", description: "Every tag across the archive." },
};

export default async function TagsPage() {
  const tags = await allTags();
  const most = [...tags].sort((a, b) => b.count - a.count)[0];

  return (
    <div className={styles.body}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Tags</span>
      </nav>

      <PageHero
        kicker="Tags"
        title="Every thread, one page."
        lede={`Everything I have written about, in ${tags.length} tags — from the tools I reach for to the places I keep going back to.`}
      />

      {most ? (
        <section className={styles.featuredSection} aria-label="Most written about">
          <Link href={`/blog/tag/${most.slug}`} className={styles.featured}>
            <span className={styles.featuredKicker}>Most written about</span>
            <span className={styles.featuredName}>{most.name}</span>
            <span className={styles.featuredMeta}>
              {most.count} {most.count === 1 ? "post" : "posts"} tagged
            </span>
          </Link>
        </section>
      ) : null}

      <section className={styles.gridSection} aria-label="All tags">
        <h2 className="section-title">All tags</h2>
        <ul className={styles.tagList}>
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Link href={`/blog/tag/${tag.slug}`} className={styles.chip}>
                <span className={styles.chipName}>{tag.name}</span>
                <span className={styles.chipCount}>{tag.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.footnote}>
        Browse by <Link href="/topics">topic</Link> or <Link href="/blog">read everything</Link>.
      </p>
    </div>
  );
}