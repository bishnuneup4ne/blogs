import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAlbums, getPostsByCategory } from "@/lib/data";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { routes } from "@/lib/routes";
import styles from "./personal.module.scss";

const description = "The trail, the camera, the morning routine — the slow things that keep the fast work honest.";

export const metadata: Metadata = {
  title: "Personal",
  description,
  alternates: { canonical: routes.personal },
  openGraph: { url: routes.personal, title: "Personal", description },
};

const ArrowRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const SOCIAL_PATHS: Record<string, string> = {
  github:
    "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
  linkedin:
    "M20.4 20.5h-3.6v-5.6c0-1.3 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.7H9.2V9h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm1.8 13.1H3.5V9h3.6v11.5Z",
};

export default async function PersonalPage() {
  const [posts, albums, settings] = await Promise.all([
    getPostsByCategory("personal"),
    getAlbums(),
    getSettings(),
  ]);
  const writing = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const socials = settings.socials.slice(0, 4);

  return (
    <div className={styles.wrap}>
      {/* ---------- Masthead ---------- */}
      <header className={styles.head}>
        <Breadcrumb items={[{ label: "Home", href: routes.home }, { label: "Personal" }]} />

        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>Personal</h1>
            <p className={styles.tagline}>{description}</p>
          </div>

          {socials.length > 0 ? (
            <div className={styles.follow}>
              <p className={styles.followLabel}>Follow</p>
              <ul>
                {socials.map((s) => {
                  const key = s.label.toLowerCase();
                  const path = SOCIAL_PATHS[key];
                  return (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                        rel="noreferrer"
                        aria-label={s.label}
                      >
                        {path ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d={path} />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {key === "email" ? (
                              <>
                                <rect x="3" y="5.5" width="18" height="13" rx="2" />
                                <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
                              </>
                            ) : (
                              <>
                                <rect x="3" y="3" width="18" height="18" rx="5" />
                                <circle cx="12" cy="12" r="4" />
                              </>
                            )}
                          </svg>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      {/* ---------- Stories ---------- */}
      {writing.length > 0 ? (
        <section className={styles.section} aria-labelledby="stories-heading">
          <div className={styles.bandHead}>
            <h2 id="stories-heading" className={styles.bandTitle}>
              Stories
            </h2>
            <Link href={routes.personalBlogs} className={styles.bandLink}>
              All {writing.length} stories
              <ArrowRight size={16} />
            </Link>
          </div>
          <ul className={styles.grid}>
            {writing.map((post, i) => {
              const cat = getCategory(post.category);
              return (
                <li key={post.slug}>
                  <article className={styles.card}>
                    <Link href={routes.post(post.slug)} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                      {post.cover ? (
                        <Image
                          src={post.cover.src}
                          alt=""
                          fill
                          priority={i === 0}
                          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 400px"
                          className={styles.cardImg}
                        />
                      ) : (
                        <span className={`${styles.cardFallback} pastel-${cat.pastel}`} />
                      )}
                    </Link>
                    <div className={styles.cardText}>
                      <h3 className={styles.cardTitle}>
                        <Link href={routes.post(post.slug)}>{post.title}</Link>
                      </h3>
                      <p className={styles.meta}>
                        {formatDate(post.date)} <span aria-hidden="true">·</span> {post.readingMinutes} min read
                      </p>
                      <Link href={routes.post(post.slug)} className={styles.cardCta} tabIndex={-1} aria-hidden="true">
                        Read article
                        <ArrowRight />
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className={styles.foot}>Nothing filed under Personal yet.</p>
      )}

      {/* ---------- Albums ---------- */}
      {albums.length > 0 ? (
        <section className={styles.section} aria-labelledby="albums-heading">
          <div className={styles.bandHead}>
            <h2 id="albums-heading" className={styles.bandTitle}>
              Photo albums
            </h2>
            <Link href={routes.gallery} className={styles.bandLink}>
              The gallery
              <ArrowRight size={16} />
            </Link>
          </div>
          <ul className={styles.grid}>
            {albums.map((album) => (
              <li key={album.slug}>
                <article className={styles.card}>
                  <Link href={routes.album(album.slug)} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                    {album.cover ? (
                      <Image
                        src={album.cover}
                        alt=""
                        fill
                        sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 400px"
                        className={styles.cardImg}
                      />
                    ) : null}
                  </Link>
                  <div className={styles.cardText}>
                    <h3 className={styles.cardTitle}>
                      <Link href={routes.album(album.slug)}>{album.title}</Link>
                    </h3>
                    <p className={styles.meta}>
                      {album.year} <span aria-hidden="true">·</span> {album.photos.length} photos
                    </p>
                    <Link href={routes.album(album.slug)} className={styles.cardCta} tabIndex={-1} aria-hidden="true">
                      View album
                      <ArrowRight />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className={styles.foot}>
        <Link href={routes.about} className={styles.footLink}>
          About me
          <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
