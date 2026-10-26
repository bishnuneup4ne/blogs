import type { Metadata } from "next";
import { relativeDate } from "@/lib/dates";
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
      <ArticleProgress title={post.title} shareUrl={url} />
      <div className={styles.page}>
        <div className={styles.grid}>
          <div className={styles.aside}>
            {settings.toggles.toc !== false && headings.length > 0 ? <InThisArticle headings={headings} /> : null}
          </div>

          <div className={styles.articleFlow}>
            <div className={styles.mainCol}>
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">›</span>
                <Link href="/categories">Topics</Link>
                <span aria-hidden="true">›</span>
                <Link href={`/blog/category/${category.slug}`}>{category.name}</Link>
              </nav>

              <h1 className={styles.title}>{post.title}</h1>

              <div className={styles.summaryRow}>
                <div className={styles.dateBlock}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span>{post.readingMinutes} min read · {relativeDate(post.date)}</span>
                </div>
                <p className={styles.summary}>{post.description}</p>
              </div>

              <div className={styles.bylineRow}>
                <div className={styles.byline}>
                  {settings.identity.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.identity.avatarUrl} alt="" className={styles.authorAvatar} width={40} height={40} />
                  ) : null}
                  <div>
                    <p className={styles.authorName}>{post.author.name}</p>
                    <p className={styles.authorRole}>{[post.author.role, settings.identity.location].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <ShareMenu title={post.title} url={url} />
              </div>
            </div>

            <div className={styles.bodyArea}>
              <div className={styles.contentCol}>
                <ArticleTools title={post.title} body={blocksToSpeech(post.blocks)} />

                <PostContent blocks={post.blocks} />

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
