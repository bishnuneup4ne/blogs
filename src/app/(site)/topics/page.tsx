import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { allCategories, getAllSeries, getAlbums } from "@/lib/data";
import { ArrowRight } from "@/components/icons/Icons";
import styles from "./topics.module.scss";
import { routes } from "@/lib/routes";

const description = "Browse the themes I write under, the series worth reading in order, and the photo collections.";

export const metadata: Metadata = {
  title: "Topics",
  description,
  alternates: { canonical: "/topics" },
  openGraph: { url: "/topics", title: "Topics", description },
};

const SHAPE_RADIUS: Record<string, string> = {
  circle: "50%",
  squircle: "38% / 38%",
  leaf: "0 60% 0 60%",
  blob: "46% 54% 58% 42% / 52% 44% 56% 48%",
  petal: "72% 28% 68% 32% / 30% 66% 34% 70%",
};

export default async function CategoriesPage() {
  const [categories, albums, allSeries] = await Promise.all([allCategories(), getAlbums(), getAllSeries()]);
  /* Every topic is listed — an empty one just shows "No stories yet". */
  const writing = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const series = [...allSeries].sort((a, b) => b.posts.length - a.posts.length);

  return (
    <div className={styles.body}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={routes.home}>Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Topics</span>
      </nav>

      <header className={styles.head}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.lede}>
          The themes I write under, plus the photo collections. Looking for something
          narrower? <Link href={routes.tags}>Browse the tags</Link>.
        </p>
        <nav className={styles.jump} aria-label="Jump to section">
          <a href="#writing" className={styles.jumpChip}>Writing</a>
          {series.length > 0 ? <a href="#series" className={styles.jumpChip}>Series</a> : null}
          {albums.length > 0 ? <a href="#albums" className={styles.jumpChip}>Photo collections</a> : null}
        </nav>
      </header>

      <section id="writing" className={styles.section} aria-label="Writing topics">
        <h2 className="section-title">Writing topics</h2>
        <div className={styles.grid}>
          {writing.map((category) => (
            <article key={category.slug} className={`${styles.card}${category.image ? "" : ` ${styles.cardTinted}`}`}>
              <div className={styles.cardTop}>
                {category.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.image}
                    alt=""
                    loading="lazy"
                    className={styles.cardShape}
                    style={{ borderRadius: SHAPE_RADIUS[category.shape ?? "circle"] ?? "50%" }}
                  />
                ) : (
                  <span className={styles.shapeFallback} aria-hidden="true">
                    {category.name.charAt(0)}
                  </span>
                )}
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>
                    <Link href={routes.category(category.slug)}>{category.name}</Link>
                  </h3>
                </div>
              </div>
              <p className={styles.cardDesc}>
                {category.description || "Stories filed under this topic as they publish."}
              </p>
              <Link href={routes.category(category.slug)} className={styles.cardBtn}>
                Read more <ArrowRight width={18} height={18} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {series.length > 0 ? (
        <section id="series" className={styles.section} aria-label="Series">
          <h2 className="section-title">Series</h2>
          <p className={styles.sectionLede}>Reading orders worth following from start to finish.</p>
          <div className={styles.seriesGrid}>
            {series.map((s) => (
              <article key={s.slug} className={styles.seriesCard}>
                <Link href={routes.series(s.slug)} className={styles.seriesMedia} tabIndex={-1} aria-hidden="true">
                  {s.cover ? (
                    <Image src={s.cover} alt="" fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 400px" className={styles.seriesImg} />
                  ) : (
                    <span className={styles.seriesFallback} />
                  )}
                </Link>
                <div className={styles.seriesBody}>
                  <h3 className={styles.cardTitle}>
                    <Link href={routes.series(s.slug)}>{s.title}</Link>
                  </h3>
                  {s.description && s.description.trim().toLowerCase() !== s.title.trim().toLowerCase() ? (
                    <p className={styles.cardDesc}>{s.description}</p>
                  ) : (
                    <p className={styles.cardDesc}>A reading order worth following from the start.</p>
                  )}
                  <Link href={routes.series(s.slug)} className={styles.cardBtn}>
                    View series <ArrowRight width={18} height={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {albums.length > 0 ? (
        <section id="albums" className={styles.section} aria-label="Photo collections">
          <h2 className="section-title">Photo collections</h2>
          <div className={styles.grid}>
            {albums.map((album) => (
              <article key={album.slug} className={styles.albumCard}>
                <Link
                  href={routes.album(album.slug)}
                  className={styles.albumMedia}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {/* A coverless album has cover === "" — an empty src makes
                      the browser re-request this page as an image. */}
                  {album.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover} alt="" loading="lazy" />
                  ) : null}
                </Link>
                <div className={styles.albumBody}>
                  <h3 className={styles.cardTitle}>
                    <Link href={routes.album(album.slug)}>{album.title}</Link>
                  </h3>
                  <p className={styles.albumMeta}>
                    {album.photos.length} photos · {album.year}
                  </p>
                  <Link href={routes.album(album.slug)} className={styles.cardBtn}>
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
