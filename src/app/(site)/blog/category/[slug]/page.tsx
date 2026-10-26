import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LatestSection } from "@/components/site/LatestSection";
import { FeaturedStory } from "@/components/site/sections";
import { allTopics, getPostsByCategory } from "@/lib/data";
import styles from "./category.module.scss";

export async function generateStaticParams() {
  const categories = await allTopics();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await allTopics();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};
  const path = `/blog/category/${category.slug}`;
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: path },
    openGraph: { url: path, title: category.name, description: category.description, type: "website" },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await allTopics();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(category.slug as any);
  const lead = posts[0];
  const rest = posts.slice(1);
  const topics = categories.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <>
      <section className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">›</span>
          <Link href="/categories">Topics</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{category.name}</span>
        </nav>
        <h1 className={styles.title}>{category.name}</h1>
        <p className={styles.lede}>{category.description}</p>

        {lead ? <FeaturedStory post={lead} kicker={category.name.toUpperCase()} /> : null}
      </section>

      {rest.length > 0 ? (
        <section className={styles.more}>
          <LatestSection
            posts={rest}
            topics={topics}
            variant="grid"
            title={`More from ${category.name}`}
          />
        </section>
      ) : null}

      <p className={styles.footnote}>
        {posts.length} {posts.length === 1 ? "story" : "stories"} filed under {category.name.toLowerCase()}.{" "}
        <Link href="/categories">Browse all topics</Link>.
      </p>
    </>
  );
}
