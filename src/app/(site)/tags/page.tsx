import type { Metadata } from "next";
import Link from "next/link";
import { allTags } from "@/lib/data";
import { ArrowRight } from "@/components/icons/Icons";
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
      <h1 className={styles.title}>Tags</h1>
      <p className={styles.lede}>
        Everything I have written about, in {tags.length} tags — from the tools I reach for to the
        places I keep going back to.
      </p>

      <section className={styles.gridSection} aria-labelledby="tags-heading">
        <h2 id="tags-heading" className="section-title">All tags</h2>
        <ul className={styles.tagList}>
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Link href={`/blog/tag/${tag.slug}`} className={styles.tagRow}>
                <span className={styles.tagName}>{tag.name}</span>
                <span className={styles.tagMeta}>
                  {tag.count} {tag.count === 1 ? "post" : "posts"}
                  <ArrowRight width={16} height={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {most ? (
        <p className={styles.footnote}>
          Most used: <Link href={`/blog/tag/${most.slug}`}>{most.name}</Link> ·{" "}
          <Link href="/topics">browse by topic instead</Link>
        </p>
      ) : null}
    </div>
  );
}