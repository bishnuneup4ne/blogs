import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, getAlbums } from "@/lib/data";
import { ArrowRight } from "@/components/icons/Icons";
import { PageHero } from "@/components/site/PageHero";
import styles from "./topics.module.scss";

export const metadata: Metadata = {
  title: "Topics",
  description: "Browse posts by topic and photo collection.",
  alternates: { canonical: "/topics" },
  openGraph: { url: "/topics", title: "Topics", description: "Browse posts by topic and photo collection." },
};

/* Four accents borrowed from the hero dots, assigned per topic slug. */
const ACCENTS = ["blue", "yellow", "red", "green"] as const;
const accentFor = (slug: string) => {
  let sum = 0;
  for (let i = 0; i < slug.length; i++) sum += slug.charCodeAt(i);
  return ACCENTS[sum % ACCENTS.length];
};

export default async function CategoriesPage() {
  const [categories, albums] = await Promise.all([allCategories(), getAlbums()]);
  const [featured, ...rest] = categories;

  return (
    <div className={styles.body}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Topics</span>
      </nav>

      <PageHero
        kicker="Topics"
        title="Pick a thread and follow it."
        lede="The themes I write under, plus the photo collections. Looking for something narrower? Browse the tags."
      >
        <Link href="/tags" className="btn btn-outline">
          Browse the tags <span aria-hidden="true">→</span>
        </Link>
      </PageHero>

      {featured ? (
        <section className={styles.featuredSection} aria-label="Most written about">
          <Link
            href={`/blog/category/${featured.slug}`}
            className={`${styles.featured} ${styles[accentFor(featured.slug)]}`}
          >
            <span className={styles.featuredGlow} aria-hidden="true" />
            <span className={styles.featuredBody}>
              <span className={styles.featuredKicker}>Most written about</span>
              <span className={styles.featuredTitle}>{featured.name}</span>
              <span className={styles.featuredDesc}>{featured.description}</span>
              <span className={styles.featuredCta}>
                {featured.count} {featured.count === 1 ? "story" : "stories"} · Browse
                <ArrowRight width={18} height={18} />
              </span>
            </span>
          </Link>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className={styles.gridSection} aria-label="All writing topics">
          <h2 className="section-title">All topics</h2>
          <div className={styles.grid}>
            {rest.map((category) => (
              <Link
                key={category.slug}
                href={`/blog/category/${category.slug}`}
                className={`${styles.card} ${styles[accentFor(category.slug)]}`}
              >
                <span className={styles.cardTop}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.count}>
                    {category.count} {category.count === 1 ? "story" : "stories"}
                  </span>
                </span>
                <h3 className={styles.cardTitle}>{category.name}</h3>
                <p className={styles.cardDesc}>{category.description}</p>
                <span className={styles.cardCta}>
                  Browse <ArrowRight width={18} height={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {albums.length > 0 ? (
        <section className={styles.albumsSection} aria-label="Photo collections">
          <h2 className="section-title">Photo collections</h2>
          <div className={styles.albumGrid}>
            {albums.map((album) => (
              <Link key={album.slug} href={`/gallery/${album.slug}`} className={styles.albumCard}>
                <span className={styles.albumCover}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={album.cover} alt="" loading="lazy" />
                  <span className={styles.albumOverlay}>
                    <span className={styles.albumName}>{album.title}</span>
                    <span className={styles.albumMeta}>{album.photos.length} photos · {album.year}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}