import Link from "next/link";
import Image from "next/image";
import { getAllPosts, getAlbums } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import styles from "./home.module.scss";

export default async function HomePage() {
  const [posts, settings, albums] = await Promise.all([getAllPosts(), getSettings(), getAlbums()]);
  const ordered = [...posts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const lead = ordered[0];
  const photo = albums.flatMap((a) => a.photos).find((p) => p.kind !== "video");

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
          <path d="M8 112C46 34 138 8 208 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M196 14l14 12-17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={styles.statementLede}>{settings.hero.standfirst}</p>
      </div>

      <div className={styles.missionRow}>
        <div className={styles.missionCopy}>
          <svg className={styles.halfCircle} viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path d="M112 60a52 52 0 1 1-52-52" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <h2 className={styles.missionTitle}>Amplifying human ingenuity</h2>
          <p className={styles.missionText}>
            I write about breaking systems to make them safer, the machines behind the
            internet, and the hills I keep walking back to. Every post is something I
            wished existed when I was learning — field notes over polished takes.
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

      {photo ? (
        <figure className={styles.photoStrip}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt={photo.alt || ""} className={styles.photoStripImg} loading="lazy" />
          <figcaption className={styles.photoStripCaption}>
            {photo.caption || "From the camera roll"} ·{" "}
            <Link href="/gallery">browse the gallery →</Link>
          </figcaption>
        </figure>
      ) : null}
    </section>
  );
}
