import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LatestSection } from "@/components/site/LatestSection";
import { allTags, allTopics, getPostsByTag, getTagName } from "@/lib/data";
import styles from "./tag.module.scss";

export async function generateStaticParams() {
  return (await allTags()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = await getTagName(slug);
  if (!name) return {};
  const title = `${name} — tagged posts`;
  const description = `All posts tagged ${name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${slug}` },
    openGraph: { url: `/blog/tag/${slug}`, title, description, type: "website" },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = await getTagName(slug);
  if (!name) notFound();

  const posts = await getPostsByTag(slug);
  const cats = await allTopics();
  const topics = cats.map((c) => ({ slug: c.slug, name: c.name }));
  const tags = await allTags();

  return (
    <>
      <div className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">›</span>
          <Link href="/blog">Feed</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{name}</span>
        </nav>
        <p className={styles.kicker}>Tag</p>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.lede}>
          {posts.length} {posts.length === 1 ? "story" : "stories"} tagged {name}.
        </p>
        <div className={styles.tags}>
          {tags.slice(0, 14).map((t) => (
            <Link key={t.slug} href={`/blog/tag/${t.slug}`} className={`pill ${t.slug === slug ? "pill-active" : ""}`}>
              {t.name}
            </Link>
          ))}
        </div>
      </div>

      <LatestSection posts={posts} topics={topics} variant="grid" />
    </>
  );
}
