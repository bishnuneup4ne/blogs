import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { relativeDate } from "@/lib/dates";
import styles from "./home.module.scss";

export default async function HomePage() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  const ordered = [...posts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const lead = ordered[0];

  return (
    <section className={styles.intro}>
      <div className={styles.introTop}>
        <h1 className={styles.introTitle}>
          {settings.identity.siteName},
          <span className={styles.introAccent}>{settings.hero.title}</span>
        </h1>
        <p className={styles.introLede}>{settings.identity.tagline}</p>
      </div>

      <div className={styles.introRow}>
        <div className={styles.introCopy}>
          <h2 className={styles.introKicker}>{settings.hero.standfirst}</h2>
          <p>
            Everything here is written by hand — what I&apos;m learning at college, the bugs I chase, the
            photos I keep. No templates, no hot takes. If something here is useful to you, that&apos;s the
            whole point.
          </p>
          <Link href="/blog" className={`${styles.pastCta} btn btn-outline`}>
            All writing →
          </Link>
        </div>

        {lead ? (
          <article className={styles.pastCard}>
            <Link href={`/blog/${lead.slug}`} className={styles.pastMedia} tabIndex={-1} aria-hidden="true">
              {lead.cover ? (
                <Image src={lead.cover.src} alt="" fill priority sizes="(max-width: 900px) 100vw, 640px" className={styles.mediaImg} />
              ) : null}
            </Link>
            <div className={styles.pastBody}>
              <h3 className={styles.pastTitle}>
                <Link href={`/blog/${lead.slug}`}>{lead.title}</Link>
              </h3>
              <p className={styles.pastDesc}>{lead.description}</p>
              <p className={styles.pastMeta}>{relativeDate(lead.date)} · {lead.readingMinutes} min read</p>
              <Link href={`/blog/${lead.slug}`} className={`${styles.pastCta} btn btn-outline`}>
                Read article →
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
