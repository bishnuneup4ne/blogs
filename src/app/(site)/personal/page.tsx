import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SectionHead, UpdateCard } from "@/components/site/sections";
import { Reveal } from "@/components/ui/Reveal";
import { getAlbums, getPostsByCategory } from "@/lib/data";
import { shortDate } from "@/lib/dates";
import styles from "./personal.module.scss";

export const metadata: Metadata = {
  title: "Personal",
  description: "Life beyond the terminal: the trail, the camera and the morning routine.",
  alternates: { canonical: "/personal" },
  openGraph: {
    url: "/personal",
    title: "Personal",
    description: "Life beyond the terminal: the trail, the camera and the morning routine.",
  },
};

export default async function PersonalPage() {
  const [lifePosts, photoPosts, albums] = await Promise.all([
    getPostsByCategory("life"),
    getPostsByCategory("photography"),
    getAlbums(),
  ]);

  // Everything personal — life and photography — in one feed.
  const writing = [...lifePosts, ...photoPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [featured, ...more] = albums;
  const latest = writing[0]?.date ?? "2026-10-21";

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Personal</span>
          </nav>

          <p className={styles.kicker}>Personal</p>
          <h1 className={styles.title}>
            The parts of a life that don&apos;t fit in a commit message.
          </h1>
          <p className={styles.lede}>
            Training, trails, photographs, the morning routine. The slow things that keep the fast
            work honest.
          </p>

          <div className={styles.mastheadActions}>
            <Link href="/gallery" className="btn btn-primary">
              Open gallery <span aria-hidden="true">→</span>
            </Link>
            <Link href="/personal/blogs" className="btn btn-outline">Personal blogs</Link>
          </div>
        </div>
      </header>

      <div className={styles.inner}>
        {featured ? (
          <section className={styles.feature} aria-labelledby="featured-album-heading">
            <Link
              href={`/gallery/${featured.slug}`}
              className={styles.featureMedia}
              tabIndex={-1}
              aria-hidden="true"
            >
              {featured.cover ? (
                <Image
                  src={featured.cover}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1000px) 100vw, 720px"
                  className={styles.featureImg}
                />
              ) : null}
            </Link>

            <div className={styles.featureText}>
              <p className={styles.kicker}>Featured album · {featured.year}</p>
              <h2 id="featured-album-heading" className={styles.featureTitle}>
                <Link href={`/gallery/${featured.slug}`}>{featured.title}</Link>
              </h2>
              {featured.subtitle ? <p className={styles.featureSub}>{featured.subtitle}</p> : null}
              {featured.description ? <p className={styles.featureDesc}>{featured.description}</p> : null}
              <p className={styles.featureMeta}>{featured.photos.length} photos</p>
              <Link href={`/gallery/${featured.slug}`} className={styles.featureCta}>
                View album <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        ) : null}

        {more.length > 0 ? (
          <section className={styles.section} aria-label="More albums">
            <SectionHead title="More albums" href="/gallery" linkLabel="All albums" />
            <div className={styles.albumGrid}>
              {more.map((album, i) => (
                <Reveal key={album.slug} delay={i * 80}>
                  <Link href={`/gallery/${album.slug}`} className={styles.albumCard}>
                    <span className={styles.albumMedia}>
                      {album.cover ? (
                        <Image src={album.cover} alt={album.title} fill sizes="(max-width: 900px) 100vw, 420px" className={styles.albumImg} />
                      ) : null}
                    </span>
                    <span className={styles.albumYear}>{album.year}</span>
                    <span className={styles.albumTitle}>{album.title}</span>
                    <span className={styles.albumSub}>{album.subtitle || album.description}</span>
                    <span className={styles.albumMeta}>{album.photos.length} photos</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} aria-label="Personal writing">
          <SectionHead title="Writing" href="/personal/blogs" linkLabel="All personal blogs" />
          <div className={styles.postGrid}>
            {writing.map((post, i) => (
              <Reveal key={post.slug} delay={i * 80}>
                <UpdateCard post={post} />
              </Reveal>
            ))}
          </div>
        </section>

        <p className={styles.footnote}>
          Last updated {shortDate(latest)} · <Link href="/about">more about me</Link>
        </p>
      </div>
    </>
  );
}
