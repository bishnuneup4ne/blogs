"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import styles from "./HomeSections.module.scss";

/* blog.google home patterns, ported to this site's tokens:
   hero rail (one big card + tinted peek cards), 3-up row, themed collection
   band, topic-filtered "The latest" feed, and a vertical "Quick tips" card.
   Measured from blog.google/: 277×449 cards, 245px square images, 24px
   radius, rail arrows + progress line. */

function Media({ post, sizes, className }: { post: Post; sizes: string; className?: string }) {
  const category = getCategory(post.category);
  if (!post.cover) {
    return <span className={`${styles.mediaFallback} pastel-${category.pastel} ${className ?? ""}`} aria-hidden="true" />;
  }
  return (
    <Image
      src={post.cover.src}
      alt=""
      fill
      sizes={sizes}
      className={className}
      style={post.cover.focal != null ? { objectPosition: `center ${post.cover.focal}%` } : undefined}
    />
  );
}

const ReadArrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const ReadPill = ({ label = "Read article" }: { label?: string }) => (
  <span className={styles.readPill}>
    {label}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  </span>
);

/* ---------- Hero rail ---------- */

export function HeroRail({ posts }: { posts: Post[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [max, setMax] = useState(0);
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const limit = t.scrollWidth - t.clientWidth;
    setMax(limit);
    setProgress(limit <= 0 ? 1 : Math.min(Math.max(t.scrollLeft / limit, 0), 1));
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    const left = t.getBoundingClientRect().left + pad;
    let best = 0;
    let bestDist = Infinity;
    (Array.from(t.children) as HTMLElement[]).forEach((el, i) => {
      const d = Math.abs(el.getBoundingClientRect().left - left);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  function go(delta: number) {
    const t = trackRef.current;
    if (!t) return;
    const next = Math.min(Math.max(active + delta, 0), posts.length - 1);
    const el = t.children[next] as HTMLElement | undefined;
    if (!el) return;
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    const start = el.getBoundingClientRect().left - t.getBoundingClientRect().left + t.scrollLeft - pad;
    t.scrollTo({ left: Math.min(Math.max(start, 0), t.scrollWidth - t.clientWidth), behavior: "smooth" });
  }

  if (posts.length === 0) return null;

  return (
    <section className={styles.heroRail} aria-label="Featured stories">
      <ul className={styles.heroTrack} ref={trackRef} onScroll={update}>
        {posts.map((post, i) => {
          const category = getCategory(post.category);
          return (
            <li key={post.slug} className={styles.heroItem}>
              <Link
                href={`/blog/${post.slug}`}
                className={`${styles.heroCard} pastel-${category.pastel}${i === 0 ? ` ${styles.heroCardLead}` : ""}`}
              >
                <span className={styles.heroText}>
                  <span className={styles.heroEyebrow}>{category.name}</span>
                  <span className={styles.heroTitle}>{post.title}</span>
                  {i === 0 ? (
                    <>
                      <span className={styles.heroSummary}>{post.description}</span>
                      <span className={styles.heroByline}>By {post.author.name}</span>
                    </>
                  ) : null}
                  <ReadPill />
                </span>
                {i === 0 ? (
                  <span className={styles.heroMedia}>
                    <Media post={post} sizes="(max-width: 900px) 100vw, 60vw" className={styles.coverImg} />
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {posts.length > 1 ? (
        <div className={styles.railControls}>
          <span className={styles.railArrows}>
            <button type="button" onClick={() => go(-1)} disabled={active <= 0} aria-label="Previous stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" onClick={() => go(1)} disabled={max > 0 && active >= posts.length - 1} aria-label="Next stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </span>
          <span className={styles.railProgress} aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(progress, 0.08)})` }} />
          </span>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- 3-up row ("More updates") ---------- */

export function ThreeUp({ title, posts, href }: { title: string; posts: Post[]; href?: string }) {
  if (posts.length === 0) return null;
  return (
    <section className={styles.band} aria-label={title}>
      <div className={styles.bandHead}>
        <h2 className={styles.bandTitle}>{title}</h2>
        {href ? <Link href={href} className={styles.bandLink}>View all<ReadArrow /></Link> : null}
      </div>
      <ul className={styles.threeUp}>
        {posts.slice(0, 3).map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className={styles.triCard}>
              <span className={styles.triMedia}>
                <Media post={post} sizes="(max-width: 760px) 100vw, 33vw" className={styles.coverImg} />
              </span>
              <span className={styles.triTitle}>{post.title}</span>
              <ReadPill />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Collection band (themed) ---------- */

export function CollectionBand({
  eyebrow,
  title,
  description,
  posts,
  href,
  theme = "mint",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  posts: Post[];
  href: string;
  theme?: "mint" | "blue" | "sand";
}) {
  if (posts.length === 0) return null;
  return (
    <section className={`${styles.collection} ${styles[`theme${theme[0].toUpperCase()}${theme.slice(1)}`]}`} aria-label={title}>
      <div className={styles.collectionInner}>
        <div className={styles.collectionCopy}>
          <p className={styles.collectionEyebrow}>{eyebrow}</p>
          <h2 className={styles.collectionTitle}>{title}</h2>
          {description ? <p className={styles.collectionText}>{description}</p> : null}
          <Link href={href} className={styles.collectionCta}>
            View the collection
            <ReadArrow />
          </Link>
        </div>
        <ul className={styles.collectionCards}>
          {posts.slice(0, 3).map((post) => {
            const category = getCategory(post.category);
            return (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className={styles.compactCard}>
                  <span className={styles.compactMedia}>
                    <Media post={post} sizes="(max-width: 760px) 60vw, 240px" className={styles.coverImg} />
                  </span>
                  <span className={styles.compactEyebrow}>{category.name}</span>
                  <span className={styles.compactTitle}>{post.title}</span>
                  <span className={styles.compactByline}>By {post.author.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- "The latest" feed with topic filter ---------- */

export function LatestFeed({
  posts,
  topics,
  title = "The latest",
  filterLabel = "Sort by topic",
}: {
  posts: Post[];
  topics: { slug: string; name: string }[];
  title?: string;
  filterLabel?: string;
}) {
  const [topic, setTopic] = useState("all");
  const counts = new Map<string, number>();
  posts.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
  const available = topics.filter((t) => (counts.get(t.slug) ?? 0) > 0);
  const rows = (topic === "all" ? posts : posts.filter((p) => p.category === topic)).slice(0, 12);

  return (
    <section className={styles.feed} aria-label={title}>
      <div className={styles.feedSide}>
        <h2 className={styles.bandTitle}>{title}</h2>
        <p className={styles.filterLabel}>{filterLabel}</p>
        <div className={styles.filterChips} role="group" aria-label={filterLabel}>
          <button type="button" className={topic === "all" ? styles.chipOn : styles.chip} aria-pressed={topic === "all"} onClick={() => setTopic("all")}>
            All News
          </button>
          {available.map((t) => (
            <button key={t.slug} type="button" className={topic === t.slug ? styles.chipOn : styles.chip} aria-pressed={topic === t.slug} onClick={() => setTopic(t.slug)}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <ul className={styles.feedRows}>
        {rows.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className={styles.feedRow}>
              <span className={styles.feedMedia}>
                <Media post={post} sizes="300px" className={styles.coverImg} />
              </span>
              <span className={styles.feedBody}>
                <span className={styles.feedChips}>
                  <span className={styles.feedChip}>{getCategory(post.category).name}</span>
                  {post.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className={`${styles.feedChip} ${styles.feedChipMuted}`}>{tag}</span>
                  ))}
                </span>
                <span className={styles.feedTitle}>{post.title}</span>
                <span className={styles.feedByline}>By {post.author.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className={styles.emptyFeed}>Nothing filed under this topic yet.</p> : null}
    </section>
  );
}

/* ---------- Quick tips (vertical video card) ---------- */

export function QuickTips({ post }: { post: Post }) {
  return (
    <section className={styles.quickTips} aria-label="Quick tips">
      <h2 className={styles.bandTitle}>Quick tips</h2>
      <Link href={`/blog/${post.slug}`} className={styles.tipCard}>
        <span className={styles.tipMedia}>
          <Media post={post} sizes="(max-width: 760px) 100vw, 360px" className={styles.coverImg} />
          <span className={styles.tipPlay} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        </span>
        <span className={styles.tipBody}>
          <span className={styles.tipTitle}>{post.title}</span>
          <span className={styles.tipText}>{post.description}</span>
          <ReadPill label="Read more" />
        </span>
      </Link>
    </section>
  );
}
