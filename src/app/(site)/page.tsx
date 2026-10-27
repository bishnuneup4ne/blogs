import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { CategoryLatest, Feature, HeroRail, ThreeUp } from "@/components/site/HomeSections";
import styles from "./home.module.scss";
export default async function HomePage() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  // Featured first for the rail, but everything else stays newest-first so
  // "Latest stories" never jumps back in time behind a featured post.
  const byDate = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const ordered = [...byDate.filter((p) => p.featured), ...byDate.filter((p) => !p.featured)];
  // blog.google home: featured rail → 3-up → "The latest" feed → quick tip.
  // Exactly one "latest" block on the page.
  const heroPosts = ordered.slice(0, 6);
  const moreUpdates = ordered.slice(6, 9);
  // One "latest" per category (5 stories + View more), never a mixed list.
  // Exclude what the first block already shows, so the two never repeat.
  const personalPosts = ordered.filter(
    (p) => p.category === "personal" && !heroPosts.includes(p) && !moreUpdates.includes(p),
  );
  const featured = ordered.find((p) => !heroPosts.includes(p) && !moreUpdates.includes(p)) ?? ordered[0];
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

      <HeroRail posts={heroPosts} />

      {moreUpdates.length > 0 ? <ThreeUp title="More updates" posts={moreUpdates} href="/blog" /> : null}

      <CategoryLatest
        title="Latest stories"
        subtitle="The newest writing across every topic."
        posts={ordered}
        moreHref="/blog"
        moreLabel="View more stories"
      />

      {personalPosts.length > 0 ? (
        <CategoryLatest
          title="Personal"
          subtitle="Notes from the life around the work."
          posts={personalPosts}
          moreHref="/personal"
          moreLabel="More on Personal"
        />
      ) : null}

      {featured ? <Feature post={featured} /> : null}

      {settings.toggles.newsletter ? (
        <NewsletterSection name={settings.identity.authorName} />
      ) : null}
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
