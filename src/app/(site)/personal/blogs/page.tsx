import type { Metadata } from "next";
import Link from "next/link";
import { UpdateCard } from "@/components/site/sections";
import { Reveal } from "@/components/ui/Reveal";
import { getPostsByCategory } from "@/lib/data";
import styles from "./personal-blogs.module.scss";

export const metadata: Metadata = {
  title: "Personal blogs",
  description: "Every personal post: the trail, the camera, the morning routine and the life around the work.",
};

export default async function PersonalBlogsPage() {
  const [life, photography] = await Promise.all([
    getPostsByCategory("life"),
    getPostsByCategory("photography"),
  ]);

  const posts = [...life, ...photography].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <header className={styles.hero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">›</span>
          <Link href="/personal">Personal</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Blogs</span>
        </nav>
        <h1 className={styles.title}>Personal blogs</h1>
        <p className={styles.lede}>
          {posts.length} posts on the trail, the camera and the morning routine — the life around
          the work.
        </p>
        <div className={styles.links}>
          <Link href="/personal" className="btn btn-outline">Personal hub</Link>
          <Link href="/gallery" className="btn btn-outline">Gallery</Link>
        </div>
      </header>

      <div className={styles.body}>
        {posts.length > 0 ? (
          <div className={styles.grid}>
            {posts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 80}>
                <UpdateCard post={post} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>Nothing here yet</h2>
            <p className={styles.emptyText}>Personal posts will appear here as they are published.</p>
            <Link href="/blog" className="btn btn-outline">Read the feed</Link>
          </div>
        )}
      </div>
    </>
  );
}