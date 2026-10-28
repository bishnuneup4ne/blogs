import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { allTopics, getPostsByCategory } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { routes } from "@/lib/routes";
import styles from "./category.module.scss";

export async function generateStaticParams() {
  const categories = await allTopics();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await allTopics();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};
  const path = routes.category(category.slug);
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: path },
    openGraph: { url: path, title: category.name, description: category.description, type: "website" },
  };
}

const ArrowRight = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await allTopics();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const posts = [...(await getPostsByCategory(category.slug))].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const [lead, ...rest] = posts;
  const otherTopics = categories.filter((c) => c.slug !== category.slug);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <Breadcrumb items={[{ label: "Home", href: routes.home }, { label: "Topics", href: routes.topics }, { label: category.name }]} />

        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>{category.name}</h1>
            <p className={styles.lede}>{category.description}</p>
          </div>
          <p className={styles.count}>
            {posts.length} {posts.length === 1 ? "story" : "stories"}
          </p>
        </div>
      </header>

      {lead ? (
        <section className={styles.lead} aria-labelledby="lead-heading">
          <Link href={routes.post(lead.slug)} className={styles.leadMedia} tabIndex={-1} aria-hidden="true">
            {lead.cover ? (
              <Image src={lead.cover.src} alt="" fill priority sizes="(max-width: 900px) 100vw, 50vw" className={styles.leadImg} />
            ) : (
              <span className={`${styles.leadFallback} pastel-${category.pastel}`} />
            )}
          </Link>
          <div className={styles.leadBody}>
            <p className={styles.kicker}>{category.name}</p>
            <h2 id="lead-heading" className={styles.leadTitle}>
              <Link href={routes.post(lead.slug)}>{lead.title}</Link>
            </h2>
            <p className={styles.leadDesc}>{lead.description}</p>
            <p className={styles.meta}>
              {formatDate(lead.date)} <span aria-hidden="true">·</span> {lead.readingMinutes} min read
            </p>
            <span className={styles.leadCta} aria-hidden="true">
              Read the story
              <ArrowRight />
            </span>
          </div>
        </section>
      ) : (
        <p className={styles.empty}>Nothing filed here yet. The first story will land right here.</p>
      )}

      {rest.length > 0 ? (
        <section className={styles.section} aria-labelledby="more-heading">
          <h2 id="more-heading" className={styles.bandTitle}>
            More from {category.name}
          </h2>
          <ul className={styles.grid}>
            {rest.map((post) => (
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
                      <span className={`${styles.cardFallback} pastel-${category.pastel}`} />
                    )}
                  </Link>
                  <div className={styles.cardText}>
                    <h3 className={styles.cardTitle}>
                      <Link href={routes.post(post.slug)}>{post.title}</Link>
                    </h3>
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
        </section>
      ) : null}

      {otherTopics.length > 0 ? (
        <section className={styles.topics} aria-labelledby="topics-heading">
          <h2 id="topics-heading" className={styles.bandTitle}>
            Other topics
          </h2>
          <ul className={styles.topicList}>
            {otherTopics.map((t) => (
              <li key={t.slug}>
                <Link href={routes.category(t.slug)} className={styles.topicRow}>
                  <span className={styles.topicName}>{t.name}</span>
                  <span className={styles.topicCount}>{t.count}</span>
                  <ArrowRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
