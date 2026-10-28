import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getAllSeries, getTopicCategory } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { site } from "@/lib/site";
import styles from "./series.module.scss";
import { routes } from "@/lib/routes";

export async function generateStaticParams() {
  return (await getAllSeries()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = (await getAllSeries()).find((s) => s.slug === slug);
  if (!series) return {};

  const url = `${site.url}/series/${series.slug}`;
  const title = `${series.title} — series`;

  return {
    title,
    description: series.description,
    alternates: { canonical: url },
    openGraph: {
      url,
      title,
      description: series.description,
      type: "website",
      images: series.cover ? [{ url: series.cover, alt: series.title }] : undefined,
    },
  };
}

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [allSeries, posts] = await Promise.all([getAllSeries(), getAllPosts()]);
  const series = allSeries.find((s) => s.slug === slug);
  if (!series) notFound();

  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const seriesPosts = series.posts
    .map((sp) => bySlug.get(sp.slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const totalTime = seriesPosts.reduce((sum, p) => sum + p.readingMinutes, 0);
  /* The head wash + kicker take the leading story's topic colour. */
  const leadCategory = seriesPosts[0] ? await getTopicCategory(seriesPosts[0].category) : null;

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={routes.home}>Home</Link>
          <span aria-hidden="true">›</span>
          <Link href={routes.blog}>Feed</Link>
          <span aria-hidden="true">›</span>
          <Link href={routes.topics}>Series</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{series.title}</span>
        </nav>

        <header className={styles.head}>
          {series.cover ? (
            <div className={styles.heroMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={series.cover} alt="" className={styles.cover} />
            </div>
          ) : null}
          <div className={styles.headCopy}>
            <p className={styles.kicker}>Series · {seriesPosts.length} parts{leadCategory ? ` · ${leadCategory.name}` : ""}</p>
            <h1 className={styles.title}>{series.title}</h1>
            {series.description ? <p className={styles.lede}>{series.description}</p> : null}
            <p className={styles.metaLine}>
              About {totalTime} min of reading in total · newest last
            </p>
          </div>
        </header>

        {seriesPosts.length > 0 ? (
          <>
            <h2 className={styles.listTitle}>The series</h2>
            <ol className={styles.grid}>
              {seriesPosts.map((post, i) => (
                <li key={post.slug}>
                  <article className={styles.card}>
                    <Link href={routes.post(post.slug)} className={styles.cardMedia} tabIndex={-1} aria-hidden="true">
                      {post.cover ? (
                        <Image
                          src={post.cover.src}
                          alt=""
                          fill
                          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 400px"
                          className={styles.cardImg}
                        />
                      ) : (
                        <span className={styles.cardFallback}>{String(i + 1).padStart(2, "0")}</span>
                      )}
                      <span className={styles.cardBadge}>{i + 1}</span>
                    </Link>
                    <div className={styles.cardText}>
                      <p className={styles.part}>Part {i + 1}</p>
                      <h3 className={styles.cardTitle}>
                        <Link href={routes.post(post.slug)}>{post.title}</Link>
                      </h3>
                      <p className={styles.cardDesc}>{post.description}</p>
                      <p className={styles.cardMeta}>
                        {formatDate(post.date)} <span aria-hidden="true">·</span> {post.readingMinutes} min read
                      </p>
                      <Link href={routes.post(post.slug)} className={styles.cardBtn}>
                        Read article <ArrowRight />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className={styles.empty}>Nothing published in this series yet.</p>
        )}
      </div>
    </div>
  );
}
