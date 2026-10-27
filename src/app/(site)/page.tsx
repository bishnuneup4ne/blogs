import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { SectionHead, UpdateCard } from "@/components/site/sections";
import styles from "./home.module.scss";

export default async function HomePage() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  const ordered = [...posts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const lead = ordered[0];
  const latest = ordered.slice(1, 7);
  // Statement headline split like blog.google/research: "Word one," floats
  // left, "word two." drops to the right on the next line.
  const words = settings.hero.title.replace(/[.,!?]+$/, "").split(/\s+/).filter(Boolean);
  // Split so both lines are close in width — the stagger reads intentional.
  let half = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < best) { best = Math.abs(a - b); half = i; }
  }
  const lineOne = words.slice(0, half).join(" ");
  const lineTwo = words.slice(half).join(" ");

  return (
    <section className={styles.intro}>
      <div className={styles.statement}>
        <h1 className={styles.statementTitle}>
          <span className={styles.stLine}>
            {lineOne},&nbsp;<span className={styles.dotBlue} aria-hidden="true" />
          </span>
          <span className={`${styles.stLine} ${styles.stLineRight}`}>
            {lineTwo}.&nbsp;<span className={styles.dotYellow} aria-hidden="true" />
          </span>
        </h1>
        <svg className={styles.arrowArc} viewBox="0 0 220 120" fill="none" aria-hidden="true">
          {/* Sits beside the lede; tail starts low-left, head at top-right points up at Newsletter */}
          <path d="M8 112C46 34 138 8 208 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M196 14 210 26l-17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={styles.statementLede}>{settings.hero.standfirst}</p>
      </div>

      <div className={styles.missionRow}>
        <div className={styles.missionCopy}>
          <svg className={styles.halfCircle} viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path d="M112 60a52 52 0 1 1-52-52" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <p className={styles.missionKicker}>The archive</p>
          <h2 className={styles.missionTitle}>
            Take it apart.<br />
            <span className={styles.missionTitleSoft}>Write it down.</span>
          </h2>
          <p className={styles.missionText}>
            Malware, machines, mountain light — I break systems to make them safer and
            photograph the hills I keep walking back to. Every post is the note I wished
            existed when I was learning: field notes over polished takes.
          </p>
          <Link href="/about" className={styles.plainLink}>
            About me <span aria-hidden="true">→</span>
          </Link>
        </div>

        {lead ? (
          <Link href={`/blog/${lead.slug}`} className={styles.scrimCard}>
            {lead.cover ? (
              <Image
                src={lead.cover.src}
                alt={lead.cover.alt || lead.title}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 720px"
                className={styles.scrimImg}
              />
            ) : null}
            <span className={styles.scrimBody}>
              <span className={styles.scrimKicker}>Latest</span>
              <span className={styles.scrimTitle}>{lead.title}</span>
              <span className={styles.scrimCta} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                </svg>
              </span>
            </span>
          </Link>
        ) : null}
      </div>

      {latest.length > 0 ? (
        <section className={styles.latestSection} aria-labelledby="latest-heading">
          <SectionHead title="Latest" href="/blog" linkLabel="All posts" />
          <ul className={styles.latestGrid}>
            {latest.map((post) => (
              <li key={post.slug} className={styles.latestCell}>
                <UpdateCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.subscribeCard} aria-labelledby="subscribe-heading">
        <p className={styles.subscribeKicker}>Newsletter</p>
        <h2 id="subscribe-heading" className={styles.subscribeTitle}>
          Get the latest from bishnuneup4ne
        </h2>
        <p className={styles.subscribeText}>
          A short email whenever something worth keeping lands here — field notes,
          write-ups, photo sets. One click to join, one click to leave.
        </p>
        <div className={styles.subscribeForm}>
          <NewsletterForm variant="pill" />
        </div>
      </section>
    </section>
  );
}
