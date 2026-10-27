import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArticleProgress } from "@/components/blog/ArticleProgress";
import { ArticleTools } from "@/components/blog/PostMetaBar";
import { PostContent } from "@/components/blog/PostContent";
import { RelatedCarousel } from "@/components/blog/RelatedCarousel";
import { ShareMenu } from "@/components/blog/ShareMenu";
import { InThisArticle } from "@/components/blog/InThisArticle";
import { ArticleDiscussion } from "@/components/blog/ArticleDiscussion";
import { ViewBeacon } from "@/components/blog/ViewBeacon";
import { formatDate, getAllPosts, getCategory, getHeadings, getPost, getRelatedPostsDetailed, tagSlug } from "@/lib/data";
import { blocksToSpeech } from "@/lib/summarize";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import styles from "./post.module.scss";

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const url = `${site.url}/blog/${post.slug}`;
  const image = post.cover?.src
    ? post.cover.src.startsWith("http")
      ? post.cover.src
      : `${site.url}${post.cover.src}`
    : undefined;

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      url,
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      images: image ? [{ url: image, alt: post.cover?.alt || post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const category = getCategory(post.category);
  const related = await getRelatedPostsDetailed(post, 6);
  const headings = getHeadings(post.blocks);
  const settings = await getSettings();
  const url = `${site.url}/blog/${post.slug}`;

  // Article progress tracking
  const progressRef = useRef<number>(0);
  const router = useRouter();

  useEffect(() => {
    let frame = 0;
    function updateProgress() {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.max(0, Math.min(1, scrollTop / docHeight)) : 0;
      if (progress !== progressRef.current) {
        progressRef.current = progress;
        // Could send to analytics here
      }
      frame = 0;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [router]);

  return (
    <>

      {settings.toggles.views ? <ViewBeacon slug={post.slug} /> : null}

      <article className={styles.article}>
        {/* Hero Section - Google Blog Style */}
        <div className={styles.hero}>

          {/* Cover Media */}
          {post.cover ? (
            <div className={styles.heroMedia} style={post.cover?.height ? ({ "--cover-h": `${post.cover.height}px` } as React.CSSProperties) : undefined}>
              <Image
                src={post.cover.src}
                alt={post.cover.alt || post.title}
                fill
                priority
                sizes="100vw"
                className={styles.heroImg}
              />
              <span className={styles.heroScrim} aria-hidden="true" />
            </div>
          ) : null}

          {/* Article Progress Bar - Google Style */}
          <div className={styles.progressBar}>
            <div className={styles.progressBarFill} style={{ width: `${progressRef.current * 100}%` }} />
          </div>

          {/* Breadcrumb and Title */}
          <div className={styles.heroContent}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/" className={styles.breadcrumbLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <polyline points="9 3 9 9 15 9" />
                </svg>
              </Link>
              <span aria-hidden="true">›</span>
              <Link href="/topics" className={styles.breadcrumbLink}>
                Topics
              </Link>
              <span aria-hidden="true">›</span>
              <Link href={`/blog/category/${category.slug}`} className={styles.breadcrumbLink}>
                {category.name}
              </Link>
            </nav>

            <h1 className={styles.heroTitle}>{post.title}</h1>

            {/* Meta Information Row */}
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <time dateTime={post.date} className={styles.metaDate}>
                  {formatDate(post.date)}
                </time>
                <span className={styles.metaDivider}>|</span>
                <span className={styles.metaReadTime}>
                  {post.readingMinutes} min read
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaAuthor}>
                  {post.author.name}
                </span>
              </div>

              {/* Share Menu */}
              <ShareMenu title={post.title} url={url} />
            </div>
          </div>
        </div>

        {/* Article Body with Progress Tracking */}
        <div className={styles.mainContent}>
          <ArticleProgress
            title={post.title}
            shareUrl={url}
            avatarUrl={settings.identity.avatarUrl || undefined}
            siteName={settings.identity.siteName}
          />

          <div className={styles.contentWrapper}>
            <div className={styles.sidebar}>

              {/* Table of Contents */}
              {settings.toggles.toc !== false && headings.length > 0 ? (
                <InThisArticle headings={headings} />
              ) : null}

            </div>

            <div className={styles.mainArea}>

              {/* Article Tools (TTS) */}
              <div className={styles.articleTools}>
                <ArticleTools title={post.title} body={blocksToSpeech(post.blocks)} />
              </div>

              {/* Post Content */}
              <PostContent blocks={post.blocks} />

              {/* Posted In Section */}
              <section className={styles.postedIn} aria-labelledby="posted-in">
                <h2 id="posted-in" className={styles.postedTitle}>Posted in:</h2>
                <ul className={styles.postedPills}>
                  <li>
                    <Link href={`/blog/category/${category.slug}`} className="pill pill-soft">
                      {category.name}
                    </Link>
                  </li>
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <Link href={`/blog/tag/${tagSlug(tag)}`} className="pill pill-soft">
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {settings.toggles.comments ? (
                <ArticleDiscussion slug={post.slug} />
              ) : null}

            </div>

          </div>

        </div>

        {/* Related Stories Section */}
        {related.length > 0 && (
          <section className={styles.related} aria-labelledby="related-heading">
            <div className={styles.relatedInner}>
              <h2 id="related-heading" className="section-title">Related stories</h2>
              <RelatedCarousel items={related} />
            </div>
          </section>
        )}

      </article>

    </>
  );
}