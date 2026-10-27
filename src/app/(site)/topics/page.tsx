import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, getAlbums } from "@/lib/data";
import { ArrowRight } from "@/components/icons/Icons";
import styles from "./topics.module.scss";

export const metadata: Metadata = {
  title: "Topics",
  description: "Browse posts by topic and photo collection.",
  alternates: { canonical: "/topics" },
  openGraph: { url: "/topics", title: "Topics", description: "Browse posts by topic and photo collection." },
};

export default async function CategoriesPage() {
  const [categories, albums] = await Promise.all([allCategories(), getAlbums()]);

  return (
    <div className={styles.body}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Topics</span>
      </nav>

      <header className={styles.head}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.lede}>
          The themes I write under, plus the photo collections. Looking for something
          narrower? <Link href="/tags">Browse the tags</Link>.
        </p>
      </header>

      <section className={styles.section} aria-label="Writing topics">
        <h2 className="section-title">Writing topics</h2>
        <div className={styles.grid}>
          {categories.map((category) => (
            <article key={category.slug} className={styles.card}>
              <span className={styles.count}>
                {category.count} {category.count === 1 ? "story" : "stories"}
              </span>
              <h3 className={styles.cardTitle}>
                <Link href={`/blog/category/${category.slug}`}>{category.name}</Link>
              </h3>
              <p className={styles.cardDesc}>{category.description}</p>
              <Link href={`/blog/category/${category.slug}`} className={styles.cardBtn}>
                Read more <ArrowRight width={18} height={18} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {albums.length > 0 ? (
        <section className={styles.section} aria-label="Photo collections">
          <h2 className="section-title">Photo collections</h2>
          <div className={styles.grid}>
            {albums.map((album) => (
              <article key={album.slug} className={styles.albumCard}>
                <Link
                  href={`/gallery/${album.slug}`}
                  className={styles.albumMedia}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={album.cover} alt="" loading="lazy" />
                </Link>
                <div className={styles.albumBody}>
                  <h3 className={styles.cardTitle}>
                    <Link href={`/gallery/${album.slug}`}>{album.title}</Link>
                  </h3>
                  <p className={styles.albumMeta}>
                    {album.photos.length} photos · {album.year}
                  </p>
                  <Link href={`/gallery/${album.slug}`} className={styles.cardBtn}>
                    Browse album <ArrowRight width={18} height={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}