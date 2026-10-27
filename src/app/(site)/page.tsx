import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { SectionHead, UpdateCard } from "@/components/site/sections";
import { ArrowRight } from "@/components/icons/Icons";
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

          <ButterflyDoodle />
          <SatelliteDoodle />

          <svg className={styles.arrowArc} viewBox="0 0 220 120" fill="none" aria-hidden="true">
            {/* Tail starts beside the second line, head curves up toward Newsletter */}
            <path d="M118 104C140 56 176 30 208 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M196 14 210 26l-17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </h1>

        <p className={styles.statementLede}>
          {settings.hero.standfirst} Every post is a field note — what broke, why, and
          what I wrote down on the way back.
        </p>
      </div>

      <section className={styles.archive} aria-labelledby="archive-heading">
        <div className={styles.archiveCopy}>
          <svg className={styles.archiveCurve} viewBox="0 0 90 240" fill="none" aria-hidden="true">
            <path d="M74 8C16 40 16 200 74 232" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <h2 id="archive-heading" className={styles.archiveTitle}>
            Take it apart.<br />
            <span className={styles.archiveTitleSoft}>Write it down.</span>
          </h2>
          <p className={styles.archiveText}>
            As I go one layer below the abstraction, I keep a human-centered note on the
            way through — publishing what I find, working with the communities I learn
            from, and photographing the hills I keep walking back to. The goal is a
            write-up that is more than a log: a partner to whoever reads it next.
          </p>
        </div>

        <div className={styles.archiveMedia}>
          {lead ? (
            <Link href={`/blog/${lead.slug}`} className={styles.player}>
              {lead.cover ? (
                <Image
                  src={lead.cover.src}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 720px"
                  className={styles.playerStill}
                />
              ) : null}
              <span className={styles.playerGrid} aria-hidden="true" />
              <span className={styles.playerInner}>
                <span className={styles.playerTitle}>{lead.title}</span>
                <span className={styles.playerPill}>
                  Read the story <ArrowRight width={18} height={18} />
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      {latest.length > 0 ? (
        <section className={styles.latestSection} aria-label="Latest posts">
          <SectionHead href="/blog" linkLabel="All posts" />
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

/* Hand-drawn butterfly: yellow wings, dark body, one blue dot — the doodle
   sitting beside the headline on blog.google/research. */
function ButterflyDoodle() {
  return (
    <svg className={styles.doodleButterfly} viewBox="0 0 74 62" fill="none" aria-hidden="true">
      <path
        d="M34 30C24 12 8 6 4 14c-4 9 8 17 26 18-18 1-30 9-26 18 4 8 20 2 30-16"
        fill="var(--yellow-500)"
        stroke="var(--gray-900)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M40 30c10-18 26-24 30-16 4 9-8 17-26 18 18 1 30 9 26 18-4 8-20 2-30-16"
        fill="var(--yellow-500)"
        stroke="var(--gray-900)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M37 22v22" stroke="var(--gray-900)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="37" cy="18" r="2.6" fill="var(--gray-900)" />
      <circle cx="49" cy="17" r="3.4" fill="var(--blue-500)" />
    </svg>
  );
}

/* Small satellite doodle with its own yellow dot. */
function SatelliteDoodle() {
  return (
    <svg className={styles.doodleSatellite} viewBox="0 0 60 44" fill="none" aria-hidden="true">
      <rect x="22.5" y="14" width="15" height="17" rx="3" fill="#fff" stroke="var(--gray-900)" strokeWidth="1.3" />
      <rect x="4" y="17.5" width="15" height="11" rx="2" fill="var(--gray-900)" />
      <rect x="41" y="17.5" width="15" height="11" rx="2" fill="var(--gray-900)" />
      <path d="M30 14V5" stroke="var(--gray-900)" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="30" cy="3.6" r="2.4" stroke="var(--gray-900)" strokeWidth="1.3" />
      <circle cx="52" cy="8" r="3" fill="var(--yellow-500)" />
    </svg>
  );
}
