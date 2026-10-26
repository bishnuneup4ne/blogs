import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, getAlbums } from "@/lib/data";
import { ArrowRight } from "@/components/icons/Icons";
import styles from "./categories.module.scss";

export const metadata: Metadata = {
  title: "Topics",
  description: "Browse posts by topic and photo collection.",
  alternates: { canonical: "/categories" },
  openGraph: { url: "/categories", title: "Topics", description: "Browse posts by topic and photo collection." },
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
      <h1 className={styles.title}>Topics</h1>
      <p className={styles.lede}>
        The themes I write under, plus the photo collections. Looking for something narrower?{" "}
        <Link href="/tags">Browse the tags</Link>.
      </p>

      <section className={styles.gridSection} aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="section-title">Writing topics</h2>
        <div className={styles.grid}>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/blog/category/${category.slug}`}
              className={styles.card}
            >
              <span className={styles.count}>{category.count} {category.count === 1 ? "story" : "stories"}</span>
              <h3 className={styles.cardTitle}>{category.name}</h3>
              <p className={styles.cardDesc}>{category.description}</p>
              <span className={styles.cardCta}>
                Browse <ArrowRight width={18} height={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.albumsSection} aria-labelledby="albums-heading">
        <h2 id="albums-heading" className="section-title">Photo collections</h2>
        <div className={styles.albumGrid}>
          {albums.map((album) => (
            <Link key={album.slug} href={`/gallery/${album.slug}`} className={styles.albumCard}>
              <span className={styles.albumCover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={album.cover} alt="" loading="lazy" />
              </span>
              <span className={styles.albumName}>{album.title}</span>
              <span className={styles.albumMeta}>{album.photos.length} photos · {album.year}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
