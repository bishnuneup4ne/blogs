import Link from "next/link";
import Image from "next/image";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/site/sections";
import { ArrowRight } from "@/components/icons/Icons";
import { allCategories, getAllPosts, getAlbums, getSubscriberCount } from "@/lib/data";
import { formatDate, relativeDate } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import styles from "./home.module.scss";

export default async function HomePage() {
  const [posts, cats, settings, albums, subscriberCount] = await Promise.all([
    getAllPosts(),
    allCategories(),
    getSettings(),
    getAlbums(),
    getSubscriberCount(),
  ]);
  const enabled = (id: string) => (settings.homeSections.find((x) => x.id === id) ?? { enabled: true }).enabled;

  const ordered = [...posts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const [lead, ...rest] = ordered;

  const galleryAlbums =
    albums.length >= 3
      ? [albums[0], albums[Math.floor(albums.length / 2)], albums[albums.length - 1]].filter(
          (a, i, arr) => arr.indexOf(a) === i,
        )
      : albums;

  return (
    <>
      {!lead ? (
        <section className={styles.empty}>
          <p className={styles.emptyKicker}>The archive</p>
          <h2 className={styles.emptyTitle}>{settings.hero.title}</h2>
          <p className={styles.emptyBody}>{settings.hero.standfirst}</p>
          <Link href="/blog" className="btn btn-primary">Browse the blog</Link>
        </section>
      ) : null}

      {/* Intro — editorial statement + the single newest story, research-page style */}
      {lead ? (
        <section className={styles.intro}>
          <div className={styles.introTop}>
            <h1 className={styles.introTitle}>
              Notes from my life,
              <span className={styles.introAccent}>one post at a time.</span>
            </h1>
            <p className={styles.introLede}>{settings.identity.tagline}</p>
          </div>
          <div className={styles.introRow}>
            <div className={styles.introCopy}>
              <h2 className={styles.introKicker}>The newest one</h2>
              <p>{lead.description}</p>
              <Link href="/blog" className={`${styles.pastCta} btn btn-outline`}>
                All writing <ArrowRight width={20} height={20} />
              </Link>
            </div>
            <article className={styles.pastCard}>
              <Link href={`/blog/${lead.slug}`} className={styles.pastMedia} tabIndex={-1} aria-hidden="true">
                {lead.cover ? (
                  <Image src={lead.cover.src} alt="" fill priority sizes="(max-width: 700px) 100vw, 640px" className={styles.mediaImg} />
                ) : null}
              </Link>
              <div className={styles.pastBody}>
                <h3 className={styles.pastTitle}>
                  <Link href={`/blog/${lead.slug}`}>{lead.title}</Link>
                </h3>
                <p className={styles.pastDesc}>{lead.description}</p>
                <p className={styles.pastMeta}>{formatDate(lead.date)} · {relativeDate(lead.date)} · {lead.readingMinutes} min read</p>
                <Link href={`/blog/${lead.slug}`} className={`${styles.pastCta} btn btn-outline`}>
                  Read article <ArrowRight width={20} height={20} />
                </Link>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {/* Past posts — full list below the hero, same card language */}
      {posts.length > 1 ? (
        <section className={`${styles.section} ${styles.pastSection}`}>
          <SectionHead title="Past posts" href="/blog" linkLabel="All posts" />
          <ul className={styles.pastRow}>
            {[...ordered].slice(3).map((post) => (
              <li key={post.slug}>
                <article className={styles.pastCard}>
                  <Link href={`/blog/${post.slug}`} className={styles.pastMedia} tabIndex={-1} aria-hidden="true">
                    {post.cover ? (
                      <Image src={post.cover.src} alt="" fill sizes="(max-width: 700px) 100vw, 380px" className={styles.mediaImg} />
                    ) : null}
                  </Link>
                  <div className={styles.pastBody}>
                    <h3 className={styles.pastTitle}>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <p className={styles.pastDesc}>{post.description}</p>
                    <p className={styles.pastMeta}>{formatDate(post.date)} · {relativeDate(post.date)} · {post.readingMinutes} min read</p>
                    <Link href={`/blog/${post.slug}`} className={`${styles.pastCta} btn btn-outline`}>
                      Read article <ArrowRight width={20} height={20} />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {albums.length > 0 ? (
        <section className={styles.section}>
          <SectionHead title="From the gallery" href="/gallery" linkLabel="Open gallery" />
          <ul className={styles.galleryRow}>
            {galleryAlbums.slice(0, 3).map((album, i) => (
              <Reveal as="li" key={album.slug} delay={i * 90}>
                <Link href={`/gallery/${album.slug}`} className={styles.galleryCard}>
                  <span className={styles.galleryMedia}>
                    {album.cover ? (
                      <Image
                        src={album.cover}
                        alt={album.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 420px"
                        className={styles.galleryImg}
                      />
                    ) : null}
                  </span>
                  <span className={styles.galleryInfo}>
                    <span className={styles.galleryYear}>{album.year} · {album.photos.length} {album.photos.length === 1 ? "photo" : "photos"}</span>
                    <span className={styles.galleryTitle}>{album.title}</span>
                    <span className={styles.gallerySub}>{album.subtitle || album.description}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {settings.toggles.newsletter && enabled("newsletter") ? (
        <NewsletterSection name={settings.identity.siteName.split(" ")[0]} authorName={settings.identity.authorName} avatarUrl={settings.identity.avatarUrl} subscriberCount={subscriberCount} />
      ) : null}
    </>
  );
}
