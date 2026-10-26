import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/blog/PostContent";
import { RelatedCarousel } from "@/components/blog/RelatedCarousel";
import { ArticleTools } from "@/components/blog/PostMetaBar";
import { ArticleDiscussion } from "@/components/blog/ArticleDiscussion";
import { ArticleProgress } from "@/components/blog/ArticleProgress";
import { ShareMenu } from "@/components/blog/ShareMenu";
import { InThisArticle } from "@/components/blog/InThisArticle";
import { ViewBeacon } from "@/components/blog/ViewBeacon";
import { formatDate, getAllPosts, getCategory, getHeadings, getPost, getRelatedPostsDetailed, getSeriesForPost, tagSlug } from "@/lib/data";
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
  const [settings, series] = await Promise.all([getSettings(), getSeriesForPost(post.slug)]);
  const url = `${site.url}/blog/${post.slug}`;

  return (
    <>
    {settings.toggles.views ? <ViewBeacon slug={post.slug} /> : null}

    {post.cover ? (
      <div className={styles.heroMedia}>
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

    <article className={post.cover ? styles.sheet : undefined}>
      <ArticleProgress title={post.title} />
      <div className={styles.page}>
        <div className={styles.grid}>
          <div className={styles.aside}>
            <InThisArticle headings={headings} />
          </div>

          <div className={styles.articleFlow}>
            <div className={styles.mainCol}>
              <h1 className={styles.title}>{post.title}</h1>

              <div className={styles.summaryRow}>
                <div className={styles.dateBlock}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span>{post.readingMinutes} min read</span>
                </div>
                <p className={styles.summary}>{post.description}</p>
              </div>

              <div className={styles.bylineRow}>
                <div className={styles.byline}>
                  <p className={styles.authorName}>{post.author.name}</p>
                  <p className={styles.authorRole}>{post.author.role}, {settings.identity.location}</p>
                </div>
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                  <Link href="/">Home</Link>
                  <span aria-hidden="true">›</span>
                  <Link href="/tags">Tags</Link>
                  {post.tags[0] ? (
                    <>
                      <span aria-hidden="true">›</span>
                      <Link href={`/blog/tag/${tagSlug(post.tags[0])}`}>{post.tags[0]}</Link>
                    </>
                  ) : null}
                </nav>
                <ShareMenu title={post.title} url={url} />
              </div>
            </div>

            <div className={styles.bodyArea}>
              <div className={styles.contentCol}>
                <ArticleTools title={post.title} body={blocksToSpeech(post.blocks)} />

                <PostContent blocks={post.blocks} />

                {series ? (
                  <section className={styles.seriesBox} aria-labelledby="series-heading">
                    <p className={styles.seriesEyebrow}>Part of a series</p>
                    <h2 id="series-heading" className={styles.seriesTitle}>
                      <Link href={`/series/${series.slug}`}>{series.title}</Link>
                    </h2>
                    {series.description ? <p className={styles.seriesDescription}>{series.description}</p> : null}
                    <ol className={styles.seriesList}>
                      {series.posts.map((item, index) => (
                        <li key={item.slug} aria-current={item.slug === post.slug ? "page" : undefined}>
                          <span className={styles.seriesNumber}>{String(index + 1).padStart(2, "0")}</span>
                          {item.slug === post.slug ? (
                            <span>{item.title}</span>
                          ) : (
                            <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}

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

                {settings.toggles.comments ? <ArticleDiscussion slug={post.slug} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className={styles.related} aria-labelledby="related-heading">
          <div className={styles.relatedInner}>
            <h2 id="related-heading" className="section-title">Related stories</h2>
            <RelatedCarousel items={related} />
          </div>
        </section>
      ) : null}
    </article>
    </>
  );
}
