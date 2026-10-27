import Link from "next/link";
import Image from "next/image";
import { LatestSection } from "@/components/site/LatestSection";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHead } from "@/components/site/sections";
import { allCategories, getAllPosts, getAlbums, getCategory, getSubscriberCount } from "@/lib/data";
import { relativeDate, shortDate } from "@/lib/dates";
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
  const topics = cats.map((c) => ({ slug: c.slug, name: c.name }));

  const ordered = [...posts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const [lead, ...rest] = ordered;
  const secondary = rest.slice(0, 2);
  const leadCategory = lead ? getCategory(lead.category) : null;

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
          <h1 className={styles.emptyTitle}>{settings.hero.title}</h1>
          <p className={styles.emptyBody}>{settings.hero.standfirst}</p>
          <Link href="/blog" className="btn btn-primary">Browse the blog</Link>
        </section>
      ) : null}

      {lead ? (
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Link href={`/blog/${lead.slug}`} className={styles.lead}>
              <span className={styles.leadMedia}>
                {lead.cover ? (
                  <Image
                    src={lead.cover.src}
                    alt={lead.cover.alt || lead.title}
                    fill
                    priority
                    sizes="(max-width: 1000px) 100vw, 760px"
                    className={styles.leadImg}
                  />
                ) : null}
              </span>
              <span className={styles.leadText}>
                <span className={styles.kicker}>{leadCategory?.name}</span>
                <h1 className={styles.leadTitle}>{lead.title}</h1>
                <span className={styles.leadDesc}>{lead.description}</span>
                <span className={styles.leadMeta}>                   {relativeDate(lead.date)} · {lead.readingMinutes} min read
                </span>
                <span className={styles.leadCta}>
                  Read more <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>

            {secondary.length > 0 ? (
              <div className={styles.side}>
                {secondary.map((post, i) => (
                  <Reveal as="li" key={post.slug} delay={i * 90}>
                    <Link href={`/blog/${post.slug}`} className={styles.sideCard}>
                      <span className={styles.sideMedia}>
                        {post.cover ? (
                          <Image
                            src={post.cover.src}
                            alt=""
                            fill
                            sizes="(max-width: 1000px) 100vw, 320px"
                            className={styles.sideImg}
                          />
                        ) : null}
                      </span>
                      <span className={styles.sideText}>
                        <span className={styles.sideTitle}>{post.title}</span>
                        <span className={styles.sideDesc}>{post.description}</span>
                        <span className={styles.sideMeta}>{relativeDate(post.date)} · Read more →</span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {enabled("latest") && rest.length > 2 ? (
        <LatestSection posts={rest.slice(2)} topics={topics} hideTitle variant="grid" />
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
