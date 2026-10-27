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
          <Link href={`/blog/${lead.slug}`} className={styles.introMedia} aria-label={`Read: ${lead.title}`}>
            {lead.cover ? (
              <Image src={lead.cover.src} alt="" fill priority sizes="(max-width: 900px) 100vw, 760px" className={styles.introMediaImg} />
            ) : null}
            <span className={styles.introMediaScrim} aria-hidden="true" />
            <span className={styles.introMediaLabel}>Watch the latest</span>
            <span className={styles.introMediaCaption}>
              {lead.title} · {relativeDate(lead.date)}
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
