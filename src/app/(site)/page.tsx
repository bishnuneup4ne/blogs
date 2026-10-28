import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/types";
import { NewsletterSection } from "@/components/site/NewsletterSection";
import { StoryCarousel } from "@/components/site/HomeSections";
import styles from "./home.module.scss";
import { routes } from "@/lib/routes";

export default async function HomePage() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);
  // Newest first; featured posts lead the rail.
  const byDate = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const featuredPosts = byDate.filter((post) => post.featured);
  const rest = byDate.filter((post) => !post.featured);
  const combined = [...featuredPosts, ...rest];
  // Distinct topics actually in print — the hero's stat row.
  const topics = [...new Set(posts.map((p) => p.category))];

  // Personal stories get their own band below the main rail: the six newest
  // from that topic (slicing the all-topics list first dropped any personal
  // post that wasn't in the global top six).
  const personalPosts = byDate.filter((p) => p.category === "personal").slice(0, 6);

  // Statement headline split like the reference: "Word one," floats left,
  // "word two." drops to the right on the next line.
  const words = settings.hero.title.replace(/[.,!?]+$/, "").split(/\s+/).filter(Boolean);
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
      <AmbientDoodles />
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
            {/* Tail rises beside the yellow dot, head points up at the header */}
            <path d="M118 104C140 56 176 30 208 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M196 14 210 26l-17 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </h1>

        <p className={styles.statementLede}>{settings.hero.standfirst}</p>
      </div>

      {combined.length > 0 ? (
        <StoryCarousel
          id="spotlight-heading"
          anchor="latest"
          ariaLabel="Featured story"
          posts={combined}
          href={routes.blog}
          limit={8}
          variant="spotlight"
          featuredSlugs={new Set(featuredPosts.map((p) => p.slug))}
        />
      ) : null}

      {personalPosts.length > 0 ? (
        <>
          <JournalFeature post={personalPosts[0]} theme={settings.featureTheme} />
          <StoryCarousel
            id="personal-rail-heading"
            title="From the personal journal"
            subtitle="Notes from the life around the work."
            posts={personalPosts.slice(1)}
            href={routes.personal}
            moreLabel="More on Personal"
            variant="journal"
          />
        </>
      ) : null}


      {settings.toggles.newsletter ? (
        <NewsletterSection name={settings.identity.authorName} />
      ) : null}
    </section>
  );
}

/* Featured story band: image on the left, title/description/button on the
   right over a prestyle colour theme chosen in admin settings. */
function JournalFeature({ post, theme }: { post: Post; theme: string }) {
  return (
    <section className={`${styles.journalFeature} ${styles[`theme-${theme}`] ?? styles["theme-blue"]}`} aria-label="Featured personal story">
      <div className={styles.jfInner}>
        <Link href={routes.post(post.slug)} className={styles.jfMedia} tabIndex={-1} aria-hidden="true">
          {post.cover ? (
            <Image src={post.cover.src} alt="" fill sizes="(max-width: 900px) 100vw, 52vw" className={styles.jfImg} />
          ) : null}
        </Link>
        <div className={styles.jfBody}>
          <h2 className={styles.jfTitle}>
            <Link href={routes.post(post.slug)}>{post.title}</Link>
          </h2>
          <p className={styles.jfDesc}>{post.description}</p>
          <p className={styles.jfMeta}>
            <strong>{post.author.name}</strong>
            <span aria-hidden="true">·</span>
            {formatDate(post.date)}
            <span aria-hidden="true">·</span>
            {post.readingMinutes} min read
          </p>
          <Link href={routes.post(post.slug)} className={styles.jfCta}>
            Read article
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Ambient doodles ----------
   One absolutely-positioned layer across the whole page, with the marks
   scattered at irregular x/y positions, sizes and rotations — never a row.
   Decorative only; hidden below 900px and under reduced-motion. */

function AmbientDoodles() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      {/* One mark per gap, alternating sides — a handful of accents, not wallpaper. */}
      <BigButterfly className={styles.am1} />
      <Moon className={styles.am2} />
      <Grass className={styles.am3} />
      <ArcArrow className={styles.am4} />
      <Leaf className={styles.am5} />
      <Dots className={styles.am6} />
      <Plane className={styles.am7} />
      <Spiral className={styles.am8} />
      <Star className={styles.am9} />
    </div>
  );
}

/* A large, sketchy butterfly — wings in aurora yellow with an ink outline. */
function BigButterfly({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 92" fill="none">
      <path d="M52 45C38 18 12 9 6 21c-6 13 12 25 39 27-27 1-45 13-39 27 6 12 32 3 45-24" fill="var(--yellow-500)" stroke="var(--gray-900)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M60 45c14-27 40-36 46-24 6 13-12 25-39 27 27 1 45 13 39 27-6 12-32 3-46-24" fill="var(--yellow-500)" stroke="var(--gray-900)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M56 33v34" stroke="var(--gray-900)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M56 33c-4-8-10-11-15-7M56 33c4-8 10-11 15-7" stroke="var(--gray-900)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="74" cy="24" r="4" fill="var(--blue-500)" />
    </svg>
  );
}


/* A tuft of grass — three strokes, uneven, like a quick sketch. */
function Grass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 44" fill="none">
      <path d="M14 40c1-10 4-18 9-24M26 40c0-12 3-22 8-29M38 40c-1-9 0-17 4-23M48 40c2-11 6-18 12-22M58 40c1-7 4-12 8-15" stroke="var(--green-600, #1e8e3e)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 41h64" stroke="var(--gray-900)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* Crescent moon, a paper plane and a leaf — three more marks for the field. */
function Moon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M34 6a18 18 0 1 0 8 30 15 15 0 0 1-8-30Z" fill="var(--yellow-500)" stroke="var(--gray-900)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="40" cy="10" r="2" fill="var(--blue-500)" />
    </svg>
  );
}

function Plane({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 54" fill="none">
      <path d="M4 26 66 4 44 50l-9-18-31-6Z" fill="#fff" stroke="var(--gray-900)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M35 32 66 4" stroke="var(--gray-900)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 44c6-1 10-4 12-8" stroke="var(--gray-400)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 4" />
    </svg>
  );
}

function Leaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 54 54" fill="none">
      <path d="M46 6C22 8 8 20 8 36c0 6 4 12 12 12 16 0 26-16 26-42Z" fill="var(--green-200, #a8dab5)" stroke="var(--green-800, #137333)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 46C22 34 32 24 44 8" stroke="var(--green-800, #137333)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Interlude doodles ----------
   A small kit of hand-drawn marks. Each is decorative only and drifts very
   slowly, so the space between sections feels drawn-on rather than empty. */


function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <path d="M24 4c2.6 10.4 7.6 15.4 18 18-10.4 2.6-15.4 7.6-18 18-2.6-10.4-7.6-15.4-18-18 10.4-2.6 15.4-7.6 18-18Z" fill="var(--yellow-500)" stroke="var(--gray-900)" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function ArcArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 90" fill="none">
      <path d="M6 78C30 34 74 10 132 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M120 8l12 8-11 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dots({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 30" fill="none">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={6 + i * 13} cy={i % 2 ? 20 : 10} r={i === 2 ? 5 : 3} fill={i === 2 ? "var(--blue-500)" : "var(--gray-400)"} />
      ))}
    </svg>
  );
}

function Spiral({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 90 120" fill="none">
      <path d="M78 6C40 10 8 38 8 72c0 24 18 42 40 42 18 0 32-12 32-28 0-14-11-24-24-24-10 0-18 7-18 16 0 7 5 12 11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
