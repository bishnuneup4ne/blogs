import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPostsByCategory } from "@/lib/data";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import { routes } from "@/lib/routes";
import styles from "./personal-blogs.module.scss";

const description =
  "Every personal post: the trail, the camera, the morning routine and the life around the work.";

export const metadata: Metadata = {
  title: "Personal blogs",
  description,
  alternates: { canonical: routes.personalBlogs },
  openGraph: { url: routes.personalBlogs, title: "Personal blogs", description },
};

export default async function PersonalBlogsPage() {
  const posts = await getPostsByCategory("personal");
  const writing = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const newest = writing[0];

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={routes.home}>Home</Link>
          <Chevron />
          <Link href={routes.personal}>Personal</Link>
          <Chevron />
          <span aria-current="page">Blogs</span>
        </nav>
        <h1 className={styles.title}>Personal blogs</h1>
        <p className={styles.lede}>{description}</p>
        <div className={styles.headFoot}>
          <p className={styles.counts}>
            {writing.length} {writing.length === 1 ? "story" : "stories"}
            {newest ? (
              <>
                <span aria-hidden="true">·</span>
                Latest {formatDate(newest.date)}
              </>
            ) : null}
          </p>
          <div className={styles.actions}>
            <Link href={routes.personal} className={styles.outlineBtn}>
              Personal hub
            </Link>
            <Link href={routes.gallery} className={styles.outlineBtn}>
              Gallery
            </Link>
          </div>
        </div>
      </header>

      {writing.length > 0 ? (
        <section className={styles.band} aria-label="All personal stories">
          <ul className={styles.grid}>
            {writing.map((post) => {
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
                          sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 300px"
                          className={styles.cardImg}
                          style={
                            post.cover.focal != null
                              ? { objectPosition: `center ${post.cover.focal}%` }
                              : undefined
                          }
                        />
                      ) : (
                        <span className={`${styles.cardFallback} pastel-${cat.pastel}`} />
                      )}
                    </Link>
                    <div className={styles.cardBody}>
                      <p className={styles.kicker}>{cat.name}</p>
                      <h3 className={styles.cardTitle}>
                        <Link href={routes.post(post.slug)}>{post.title}</Link>
                      </h3>
                      <p className={styles.cardMeta}>
                        {formatDate(post.date)} · {post.readingMinutes} min read
                      </p>
                      <Link href={routes.post(post.slug)} className={styles.cardCta} tabIndex={-1} aria-hidden="true">
                        Read article
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className={styles.empty}>
          <h2>Nothing here yet</h2>
          <p>Personal posts will appear here as they are published.</p>
          <Link href={routes.blog} className={styles.outlineBtn}>
            Read the feed
          </Link>
        </div>
      )}
    </div>
  );
}

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
