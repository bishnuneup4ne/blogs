import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/icons/Icons";
import type { Post } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { relativeDate, shortDate } from "@/lib/dates";
import styles from "./sections.module.scss";

export function UpdateCard({ post, showByline = false }: { post: Post; showByline?: boolean }) {
  const category = getCategory(post.category);
  return (
    <article className={styles.updateCard}>
      <Link
        href={`/blog/${post.slug}`}
        className={`${styles.updateMedia} pastel-${category.pastel}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {post.cover ? (
          <Image src={post.cover.src} alt="" fill sizes="(max-width: 900px) 100vw, 420px" className={styles.mediaImg} />
        ) : (
          <span className={`${styles.mediaFallback} pastel-${category.pastel}`} />
        )}
        {/* blog.google style: the topic rides on the photo in its own colour. */}
        <span className={styles.topicOverlay}>{category.name}</span>
      </Link>
      <div className={styles.updateBody}>
        <h3 className={styles.updateTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {showByline && post.author?.name ? (
          <p className={styles.updateByline}>By {post.author.name}</p>
        ) : null}
        <Link href={`/blog/${post.slug}`} className={styles.readArticle}>
          Read article <ArrowRight width={20} height={20} />
        </Link>
      </div>
    </article>
  );
}


export function SectionHead({ title, href, linkLabel }: { title?: string; href?: string; linkLabel?: string }) {
  return (
    <div className={styles.sectionHead}>
      {title ? <h2 className="section-title">{title}</h2> : <span />}
      {href ? (
        <Link href={href} className={styles.sectionLink}>
          {linkLabel ?? "See all"}
          <ArrowRight width={18} height={18} />
        </Link>
      ) : null}
    </div>
  );
}

