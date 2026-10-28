import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleProgress } from "@/components/blog/ArticleProgress";
import { ArticleTools } from "@/components/blog/PostMetaBar";
import { PostContent } from "@/components/blog/PostContent";
import { RelatedCarousel } from "@/components/blog/RelatedCarousel";
import { ShareMenu } from "@/components/blog/ShareMenu";
import { InThisArticle } from "@/components/blog/InThisArticle";
import { ArticleDiscussion } from "@/components/blog/ArticleDiscussion";
import { ViewBeacon } from "@/components/blog/ViewBeacon";
import { formatDate, getAllPosts, getAllSeries, getCategory, getHeadings, getPost, getRelatedPostsDetailed, getTopicCategory, tagSlug } from "@/lib/data";
import { blocksToSpeech } from "@/lib/summarize";
import { getSettings } from "@/lib/settings";
import styles from "./post.module.scss";
import { routes, url as urlFor } from "@/lib/routes";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

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

  const url = urlFor(routes.post(post.slug));
  const image = post.cover?.src
    ? post.cover.src.startsWith("http")
      ? post.cover.src
      : urlFor(post.cover.src)
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

/* Each story's header gets its own wash — taken straight from the topic's
   pastel, so a red topic is red everywhere (admin can change it per topic). */
/* The hero wash follows the topic's own colour, set in the admin. A hex →
   rgba mix gives a soft tint at a fixed low alpha, so any colour the editor
   picks still reads as a background rather than a block of paint. */
function tint(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return `rgb(60 64 67 / ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const category = await getTopicCategory(post.category);
  const related = await getRelatedPostsDetailed(post, 12);
  const headings = getHeadings(post.blocks);
  // The reading bar shows a recognisable image for the story: the cover when
  // set, otherwise the first picture in the body, so it never falls back to
  // the site avatar for posts without a cover.
  const bodyImage = post.blocks
    .flatMap((b) =>
      b.type === "image" ? [b.src] : b.type === "row" ? b.items.flatMap((it) => (it.kind === "quote" ? [] : [it.src])) : [],
    )
    .find((src) => typeof src === "string" && src.length > 0 && !/\.(mp4|webm)(\?|$)/i.test(src));
  const barImage = post.cover?.src ?? bodyImage;
  const settings = await getSettings();
  const url = urlFor(routes.post(post.slug));
  const seriesIn = (await getAllSeries()).find((s) => s.posts.some((p) => p.slug === post.slug));

  return (
    <div
      className={`${styles.postPage} pastel-${category.pastel ?? "blue"}`}
      style={
        {
          "--wash": tint(category.color, 0.22),
          "--wash-2": tint(category.color, 0.09),
          /* Topic tint over the cover photo, so a post reads as its colour. */
          "--cover-tint": tint(category.color, 0.3),
        } as React.CSSProperties
      }
    >
      {settings.toggles.views ? <ViewBeacon slug={post.slug} /> : null}

      {post.cover ? (
        <div
          className={styles.heroMedia}
          style={
            {
              ...(post.cover?.height ? { "--cover-h": `${post.cover.height}px` } : {}),
              ...(post.cover?.focal != null ? { "--cover-focal": `${post.cover.focal}%` } : {}),
            } as React.CSSProperties
          }
        >
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
        <ArticleProgress
          title={post.title}
          shareUrl={url}
          postSlug={post.slug}
          coverUrl={barImage}
          avatarUrl={settings.identity.avatarUrl || undefined}
          siteName={settings.identity.siteName}
        />

        <div className={styles.page}>
          <div className={styles.grid}>
            <div className={styles.aside}>
              {settings.toggles.toc !== false && headings.length > 0 ? <InThisArticle headings={headings} /> : null}
            </div>

            <div className={styles.articleFlow}>
              <div className={styles.mainCol}>
                {/* The trail ends at the topic; series membership is a
                    separate chip on the right, not another crumb. */}
                <div className={styles.crumbRow}>
                  <Breadcrumb
                    items={[
                      { label: "Home", href: routes.home },
                      { label: "Topics", href: routes.topics },
                      { label: category.name, href: routes.category(category.slug) },
                    ]}
                  />
                  {seriesIn ? (
                    <Link href={routes.series(seriesIn.slug)} className={styles.seriesChip} style={{ ["--chip-accent" as string]: category.color }}>
                      <SeriesIcon />
                      Included in {seriesIn.title}
                    </Link>
                  ) : null}
                </div>

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
                    {settings.identity.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.identity.avatarUrl} alt="" className={styles.authorAvatar} width={40} height={40} />
                    ) : null}
                    <div>
                      <p className={styles.authorName}>{post.author.name}</p>
                      <p className={styles.authorRole}>
                        {[post.author.role, settings.identity.location].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className={styles.bylineActions}>
                    <ArticleTools title={post.title} body={blocksToSpeech(post.blocks)} />
                    <ShareMenu title={post.title} url={url} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bodyArea}>
              <div className={styles.contentCol}>
                <PostContent blocks={post.blocks} />

                <section className={styles.postedIn} aria-labelledby="posted-in">
                  <h2 id="posted-in" className={styles.postedTitle}>Posted in</h2>
                  <ul className={styles.postedPills}>
                    {post.tags.map((tag) => (
                      <li key={tag}>
                        <Link href={routes.tag(tagSlug(tag))} className={styles.postedTag}>
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

        {related.length > 0 ? (
          <section className={styles.related} aria-labelledby="related-heading">
            <div className={styles.relatedInner}>
              <h2 id="related-heading" className="section-title">Related stories</h2>
              <RelatedCarousel items={related} />
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}

const SeriesIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h11M4 12h11M4 18h7" />
    <path d="m17 14 4 3-4 3" />
  </svg>
);
