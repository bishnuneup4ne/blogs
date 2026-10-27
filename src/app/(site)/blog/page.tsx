import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LatestSection } from "@/components/site/LatestSection";
import { allCategories, getAllPosts } from "@/lib/data";
import styles from "./blog.module.scss";

export const metadata: Metadata = {
  title: "Feed",
  description: "Every post from newest to oldest: engineering, security, field notes, life, photography and essays.",
  alternates: { canonical: "/blog" },
  openGraph: {
    url: "/blog",
    title: "Feed",
    description: "Every post from newest to oldest: engineering, security, field notes, life, photography and essays.",
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const cats = await allCategories();
  const topics = cats.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <>
      {/* Hero Section - Google Blog Style */}
      <div className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroTop}>
            <div className={styles.heroLeft}>
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link href="/" className={styles.breadcrumbLink}>
                  Home
                </Link>
                <span aria-hidden="true">›</span>
                <span aria-current="page" className={styles.breadcrumbCurrent}>Feed</span>
              </nav>

              <h1 className={styles.heroTitle}>All stories</h1>

              <p className={styles.heroLede}>
                {posts.length} posts on building secure systems, the work of writing, and the life around it.
              </p>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.topicChips}>
                {cats.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/blog/category/${c.slug}`}
                    className={styles.topicChip}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Background Shape - Google Style */}
          <div className={styles.heroShape} />
        </div>
      </div>

      {/* Post Listing Grid */}
      <LatestSection
        posts={posts}
        topics={topics}
        variant="grid"
        hideTitle
        markFirst
      />
    </>
  );
}