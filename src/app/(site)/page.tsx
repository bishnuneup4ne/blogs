import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { SectionHead, UpdateCard } from "@/components/site/sections";
import { ArrowRight } from "@/components/icons/Icons";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
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
  const latestDate = ordered[0] ? formatDate(ordered[0].date, { long: true }) : "";

  return (
    <section className={styles.intro}>
      <div className={styles.statement}>
        <div className={styles.statementHead}>
          <p className={styles.statementKicker}>
            <span className={styles.kickerRule} aria-hidden="true" />
            Notes worth keeping
          </p>
          <p className={styles.statementMeta}>
            {posts.length} {posts.length === 1 ? "post" : "posts"}
            {latestDate ? <> · updated {latestDate}</> : null}
          </p>
        </div>

        <h1 className={styles.statementTitle}>
          <span className={styles.stLine}>
            {lineOne},&nbsp;<span className={styles.dotBlue} aria-hidden="true" />
          </span>
          <span className={`${styles.stLine} ${styles.stLineRight}`}>
            {lineTwo}.&nbsp;<span className={styles.dotYellow} aria-hidden="true" />
          </span>
        </h1>

        <svg className={styles.arrowArc} viewBox="0 0 220 120" fill="none" aria-hidden="true">
          {/* Tail starts beside the second line, head curves up toward Newsletter */}
          <path d="M118 104C140 56 176 30 208 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M196 14 210 26l-17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className={styles.statementFoot}>
          <p className={styles.statementLede}>{settings.hero.standfirst}</p>
          <div className={styles.statementActions}>
            <Link href="/blog" className="btn btn-primary">
              Start reading <span aria-hidden="true">→</span>
            </Link>
            <Link href="/rss.xml" className="btn btn-outline">RSS feed</Link>
          </div>
        </div>
      </div>

      <section className={styles.archive} aria-labelledby="archive-heading">
        <div className={styles.archiveCopy}>
          <p className={styles.archiveKicker}>
            <span className={styles.kickerRule} aria-hidden="true" />
            The archive
          </p>
          <h2 id="archive-heading" className={styles.archiveTitle}>
            Take it apart.<br />
            <span className={styles.archiveTitleSoft}>Write it down.</span>
          </h2>
          <p className={styles.archiveText}>
            Malware, machines, mountain light — I break systems to make them safer and
            photograph the hills I keep walking back to. Every post is the note I wished
            existed when I was learning: field notes over polished takes.
          </p>
          <div className={styles.archiveActions}>
            <Link href="/about" className="btn btn-outline">
              About me <span aria-hidden="true">→</span>
            </Link>
            <Link href="/topics" className={styles.archivePlain}>
              Browse topics <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {lead ? (
          <Link href={`/blog/${lead.slug}`} className={styles.leadCard}>
            <span className={styles.leadMedia}>
              {lead.cover ? (
                <Image
                  src={lead.cover.src}
                  alt={lead.cover.alt || lead.title}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 720px"
                  className={styles.leadImg}
                />
              ) : (
                <span className={`${styles.leadFallback} pastel-${getCategory(lead.category).pastel}`} />
              )}
              <span className={styles.leadBadge}>Latest story</span>
            </span>

            <span className={styles.leadBody}>
              <span className={styles.leadMeta}>
                {getCategory(lead.category).name} · {lead.readingMinutes} min read
              </span>
              <span className={styles.leadTitle}>{lead.title}</span>
              <span className={styles.leadCta}>
                Read story <ArrowRight width={18} height={18} />
              </span>
            </span>
          </Link>
        ) : null}
      </section>

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
