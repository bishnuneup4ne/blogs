import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./StoryFeed.module.scss";
import { routes } from "@/lib/routes";

const ArrowRight = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Cover({ post, sizes, priority }: { post: Post; sizes: string; priority?: boolean }) {
  if (!post.cover) {
    return <span className={`${styles.mediaFallback} pastel-${getCategory(post.category).pastel}`} aria-hidden="true" />;
  }
  return (
    <Image
      src={post.cover.src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={styles.mediaImg}
      style={post.cover.focal != null ? { objectPosition: `center ${post.cover.focal}%` } : undefined}
    />
  );
}

function Meta({ post }: { post: Post }) {
  return (
    <p className={styles.meta}>
      <span>{formatDate(post.date)}</span>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
    </p>
  );
}


export function StoryGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className={styles.empty}>Nothing published yet — the first story will land right here.</p>;
  }
  return (
    <ul className={styles.grid}>
      {posts.map((post, i) => {
        const category = getCategory(post.category);
        return (
          <Reveal as="li" key={post.slug} delay={(i % 3) * 70} className={styles.cell}>
            <article className={styles.card}>
              <Link href={routes.post(post.slug)} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                <Cover post={post} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 440px" />
                {post.cover ? null : (
                  <span className={`${styles.mediaFallback} pastel-${category.pastel}`} aria-hidden="true" />
                )}
              </Link>
              <div className={styles.cardBody}>
                <p className={styles.kicker}>{category.name}</p>
                <h3 className={styles.cardTitle}>
                  <Link href={routes.post(post.slug)}>{post.title}</Link>
                </h3>
                <p className={styles.cardDesc}>{post.description}</p>
                <Meta post={post} />
                <Link href={routes.post(post.slug)} className={styles.cardCta} tabIndex={-1} aria-hidden="true">
                  Read article
                  <ArrowRight size={18} />
                </Link>
              </div>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}
