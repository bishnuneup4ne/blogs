import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/icons/Icons";
import type { Post } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { relativeDate, shortDate } from "@/lib/dates";
import styles from "./sections.module.scss";

export function UpdateCard({ post }: { post: Post }) {
  const category = getCategory(post.category);
  return (
    <article className={styles.updateCard}>
      <Link
        href={`/blog/${post.slug}`}
        className={styles.updateMedia}
        tabIndex={-1}
        aria-hidden="true"
      >
        {post.cover ? (
          <Image src={post.cover.src} alt="" fill sizes="(max-width: 900px) 100vw, 420px" className={styles.mediaImg} />
        ) : (
          <span className={`${styles.mediaFallback} pastel-${category.pastel}`} />
        )}
      </Link>
      <div className={styles.updateBody}>
        <h3 className={styles.updateTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <Link href={`/blog/${post.slug}`} className={`${styles.readArticle} btn btn-outline`}>
          Read article <ArrowRight width={20} height={20} />
        </Link>
      </div>
    </article>
  );
}

export function FeaturedStory({ post, kicker }: { post: Post; kicker: string }) {
  return (
    <article className={styles.featured}>
      <Link href={`/blog/${post.slug}`} className={styles.featuredMedia} tabIndex={-1} aria-hidden="true">
        {post.cover ? (
          <Image src={post.cover.src} alt="" fill priority sizes="(max-width: 900px) 100vw, 60vw" className={styles.mediaImg} />
        ) : null}
      </Link>
      <div className={styles.featuredText}>
        <p className={styles.featuredKicker}>{kicker}</p>
        <h2 className={styles.featuredTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className={styles.featuredDesc}>{post.description}</p>
        <Link href={`/blog/${post.slug}`} className={styles.featuredArrow} aria-label={`Read ${post.title}`}>
          <ArrowRight width={24} height={24} />
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

