import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getAllPosts, getAllSeries, getSeries } from "@/lib/data";
import styles from "./series.module.scss";

export async function generateStaticParams() {
  return (await getAllSeries()).map((series) => ({ slug: series.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeries(slug);
  if (!series) notFound();
  return {
    title: series.title,
    description: series.description,
    alternates: { canonical: `/series/${series.slug}` },
    openGraph: {
      url: `/series/${series.slug}`,
      title: series.title,
      description: series.description,
      type: "website",
    },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [series, posts] = await Promise.all([getSeries(slug), getAllPosts()]);
  if (!series) notFound();
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const entries = series.posts.flatMap((item) => {
    const post = bySlug.get(item.slug);
    return post ? [{ ...item, date: post.date, readingMinutes: post.readingMinutes }] : [];
  });
  if (entries.length === 0) notFound();

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span>Series</span>
      </nav>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Series</p>
        <h1 className={styles.title}>{series.title}</h1>
        {series.description ? <p className={styles.description}>{series.description}</p> : null}
        <p className={styles.count}>{entries.length} {entries.length === 1 ? "story" : "stories"} in order.</p>
      </header>
      <ol className={styles.list}>
        {entries.map((entry, index) => (
          <li key={entry.slug}>
            <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2 className={styles.itemTitle}>
                <Link href={`/blog/${entry.slug}`}>{entry.title}</Link>
              </h2>
              <p className={styles.meta}>{formatDate(entry.date)} · {entry.readingMinutes} min read</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
