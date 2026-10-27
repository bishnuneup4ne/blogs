import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SectionHead, UpdateCard } from "@/components/site/sections";
import { PageHero } from "@/components/site/PageHero";
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
  const [personalPosts, albums] = await Promise.all([
    getPostsByCategory("personal"),
    getAlbums(),
  ]);

  // Everything under the Personal topic, newest first.
  const writing = personalPosts;
  const [featured, ...more] = albums;
  const latest = writing[0]?.date;

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Personal</span>
          </nav>

          <PageHero
            kicker="Personal"
            title="The parts of a life that don’t fit in a commit message."
            lede="Training, trails, photographs, the morning routine. The slow things that keep the fast work honest."
          >
            <Link href="/gallery" className="btn btn-primary">
              Open gallery <span aria-hidden="true">→</span>
            </Link>
            <Link href="/personal/blogs" className="btn btn-outline">Personal blogs</Link>
          </PageHero>
        </div>
      </header>

      <div className={styles.inner}>
        {featured ? (
          <section className={styles.featureSection} aria-label="Featured album">
            <Link href={`/gallery/${featured.slug}`} className={styles.scrimCard}>
              {featured.cover ? (
                <Image
                  src={featured.cover}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1000px) 100vw, 1180px"
                  className={styles.scrimImg}
                />
              ) : null}
              <span className={styles.scrimKicker}>Featured album · {featured.year}</span>
              <span className={styles.scrimBody}>
                <span className={styles.scrimText}>
                  <span className={styles.scrimTitle}>{featured.title}</span>
                  {featured.subtitle ? <span className={styles.scrimSub}>{featured.subtitle}</span> : null}
                  <span className={styles.scrimMeta}>{featured.photos.length} photos</span>
                </span>
                <span className={styles.scrimCta} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
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
          {writing.length > 0 ? (
            <div className={styles.postGrid}>
              {writing.map((post, i) => (
                <Reveal key={post.slug} delay={i * 80}>
                  <UpdateCard post={post} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No personal posts yet. Check back soon.</p>
          )}
        </section>

        {latest ? (
          <p className={styles.footnote}>
            Last updated {shortDate(latest)} · <Link href="/about">more about me</Link>
          </p>
        ) : null}
      </div>
    </>
  );
}
