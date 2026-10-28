import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getAllPosts } from "@/lib/data";
import { countLabel, formatDate } from "@/lib/dates";
import { routes } from "@/lib/routes";
import styles from "./blog.module.scss";

const description =
  "Every post from newest to oldest: engineering, security, field notes, life, photography and essays.";

export const metadata: Metadata = {
  title: "Feed",
  description,
  alternates: { canonical: routes.blog },
  openGraph: { url: routes.blog, title: "Feed", description },
};

const ArrowRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function BlogPage() {
  const all = await getAllPosts();
  const posts = [...all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <Breadcrumb items={[{ label: "Home", href: routes.home }, { label: "Feed" }]} />

        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>All stories</h1>
            <p className={styles.lede}>{description}</p>
          </div>
          <p className={styles.count}>{countLabel(posts.length)}</p>
        </div>

      </header>

      {/* Every story, newest first — no featured slot, no topic privileges. */}
      {posts.length > 0 ? (
        <ul className={styles.grid}>
          {posts.map((post, i) => (
            <li key={post.slug}>
              <article className={`${styles.card}${post.cover ? "" : ` ${styles.cardTinted}`}`}>
                {post.cover ? (
                  <Link href={routes.post(post.slug)} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                    <Image
                      src={post.cover.src}
                      alt=""
                      fill
                      priority={i === 0}
                      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 400px"
                      className={styles.cardImg}
                    />
                  </Link>
                ) : null}
                <div className={styles.cardText}>
                  <h3 className={styles.cardTitle}>
                    <Link href={routes.post(post.slug)}>{post.title}</Link>
                  </h3>
                  <p className={styles.cardDesc}>{post.description}</p>
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
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Nothing published yet — the first story will land right here.</p>
      )}
    </div>
  );
}
