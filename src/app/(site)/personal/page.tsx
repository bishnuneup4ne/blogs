import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CategoryLatest, HeroRail } from "@/components/site/HomeSections";
import { SectionHead } from "@/components/site/sections";
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

  const writing = personalPosts;
  const railPosts = writing.slice(0, 4);
  const [featured, ...moreAlbums] = albums;
  const latest = writing[0]?.date;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
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
          Training, trails, photographs, the morning routine. The slow things that keep the fast work honest.
        </p>

        <div className={styles.heroActions}>
          <Link href="/gallery" className={styles.primaryCta}>
            Open gallery
            <Arrow />
          </Link>
          <Link href="/personal/blogs" className={styles.secondaryCta}>
            Personal blogs
          </Link>
        </div>
      </header>

      {railPosts.length > 0 ? <HeroRail posts={railPosts} /> : null}

      {featured ? (
        <section className={styles.albumBand} aria-labelledby="featured-album">
          <div className={styles.albumCopy}>
            <p className={styles.albumEyebrow}>Featured album · {featured.year}</p>
            <h2 id="featured-album" className={styles.albumTitle}>
              <Link href={`/gallery/${featured.slug}`}>{featured.title}</Link>
            </h2>
            {featured.subtitle ? <p className={styles.albumSub}>{featured.subtitle}</p> : null}
            {featured.description ? <p className={styles.albumDesc}>{featured.description}</p> : null}
            <p className={styles.albumMeta}>{featured.photos.length} photos</p>
            <Link href={`/gallery/${featured.slug}`} className={styles.secondaryCta}>
              View album
              <Arrow />
            </Link>
          </div>
          <Link
            href={`/gallery/${featured.slug}`}
            className={styles.albumMedia}
            tabIndex={-1}
            aria-hidden="true"
          >
            {featured.cover ? (
              <Image
                src={featured.cover}
                alt=""
                fill
                priority
                sizes="(max-width: 1000px) 100vw, 760px"
                className={styles.albumImg}
              />
            ) : null}
          </Link>
        </section>
      ) : null}

      {moreAlbums.length > 0 ? (
        <section className={styles.section} aria-label="More albums">
          <SectionHead title="More albums" href="/gallery" linkLabel="All albums" />
          <ul className={styles.albumGrid}>
            {moreAlbums.map((album, i) => (
              <Reveal as="li" key={album.slug} delay={i * 70}>
                <Link href={`/gallery/${album.slug}`} className={styles.albumCard}>
                  <span className={styles.cardMedia}>
                    {album.cover ? (
                      <Image src={album.cover} alt="" fill sizes="(max-width: 900px) 100vw, 360px" className={styles.cardImg} />
                    ) : null}
                  </span>
                  <span className={styles.cardEyebrow}>Album · {album.year}</span>
                  <span className={styles.cardTitle}>{album.title}</span>
                  <span className={styles.cardMeta}>{album.photos.length} photos</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {writing.length > 0 ? (
        <CategoryLatest
          title="Writing"
          subtitle="Everything filed under Personal, newest first."
          posts={writing}
          moreHref="/personal/blogs"
          moreLabel="All personal blogs"
        />
      ) : null}

      <p className={styles.footnote}>
        {latest ? <>Last updated {shortDate(latest)} · </> : null}
        <Link href="/about">more about me</Link>
      </p>
    </main>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
