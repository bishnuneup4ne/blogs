"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatDate } from "@/lib/dates";
import styles from "./HomeSections.module.scss";

/* Rotating pastel washes so every spotlight blog reads a different colour. */
const TILE_WASHES = [
  "heroTileWash-lime",
  "heroTileWash-blue",
  "heroTileWash-indigo",
  "heroTileWash-mint",
  "heroTileWash-peach",
  "heroTileWash-butter",
  "heroTileWash-lavender",
].map((k) => styles[k]);
import { routes } from "@/lib/routes";

/* blog.google home patterns, ported to this site's tokens:
   hero rail (one big card + tinted peek cards), 3-up row, themed collection
   band, topic-filtered "The latest" feed, and a vertical "Quick tips" card.
   Measured from blog.google/: 277×449 cards, 245px square images, 24px
   radius, rail arrows + progress line. */

function Media({ post, sizes, className, eager }: { post: Post; sizes: string; className?: string; eager?: boolean }) {
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
      priority={eager}
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




/* ---------- Personal rail: a real carousel with arrows + progress ---------- */

/* Shared story rail — used by "Latest stories" and "Latest Personal Stories".
   Arrows page one card at a time; the hairline tracks scroll position. */
export function StoryCarousel({
  posts,
  href,
  title,
  subtitle,
  moreLabel,
  id,
  anchor,
  ariaLabel,
  limit = 8,
  featuredSlugs,
  variant = "plain",
}: {
  posts: Post[];
  href: string;
  title?: string;
  subtitle?: string;
  moreLabel?: string;
  id: string;
  /** Element id on the section — lets the hero CTA scroll here. */
  anchor?: string;
  /** aria-label when there is no visible title. */
  ariaLabel?: string;
  limit?: number;
  /** Posts to give the wider "lead" treatment at the head of the rail. */
  featuredSlugs?: Set<string>;
  /** `tinted` swaps the card skin so stacked sections never look identical.
      `spotlight` renders the research-page slide: copy left, dark media right.
      `journal` is the premium lavender band for personal stories. */
  variant?: "plain" | "tinted" | "spotlight" | "journal";
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  const indexRef = useRef(0);
  const animatingRef = useRef(false);

  const sync = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const left = t.scrollLeft;
    setScrollable(max > 8);
    setProgress(max <= 0 ? 1 : Math.min(Math.max(left / max, 0), 1));
    setAtStart(left <= 4);
    setAtEnd(max <= 0 || left >= max - 4);
    {
      const box = t.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      let best = 0;
      let bestDist = Infinity;
      (Array.from(t.children) as HTMLElement[]).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      indexRef.current = best;
    }
  }, []);

  useEffect(() => {
    sync();
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.globalTimeline.timeScale(100);
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  function go(delta: number) {
    const t = trackRef.current;
    if (!t || animatingRef.current) return;
    const cards = Array.from(t.children) as HTMLElement[];
    // Current stop = whichever slide's centre is nearest the rail's centre.
    const box = t.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let current = indexRef.current;
    let bestDist = Infinity;
    cards.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) { bestDist = d; current = i; }
    });
    const next = Math.min(Math.max(current + delta, 0), cards.length - 1);
    const target = cards[next];
    if (!target) return;
    // GSAP-driven glide (no native smooth-scroll fight with snap).
    const pad = parseFloat(getComputedStyle(t).paddingLeft) || 0;
    const trackLeft = t.getBoundingClientRect().left;
    const cardStart = target.getBoundingClientRect().left - trackLeft + t.scrollLeft - pad;
    const left = Math.min(Math.max(cardStart, 0), t.scrollWidth - t.clientWidth);
    animatingRef.current = true;
    indexRef.current = next;
    // Snap would yank the glide mid-flight; re-enable when it settles.
    t.style.scrollSnapType = "none";
    const proxy = { x: t.scrollLeft };
    gsap.to(proxy, {
      x: left,
      duration: 0.9,
      ease: "power3.inOut",
      onUpdate: () => { t.scrollLeft = proxy.x; },
      onComplete: () => {
        t.style.scrollSnapType = "";
        animatingRef.current = false;
        sync();
      },
    });
  }

  if (posts.length === 0) return null;

  if (variant === "spotlight") {
    return (
      <section id={anchor} className={styles.spotlightBand} aria-label={ariaLabel ?? title ?? "Featured stories"}>
        <ul className={styles.spotlightTrack} ref={trackRef} onScroll={sync}>
          {posts.slice(0, limit).map((post, i) => (
            <li key={post.slug} className={styles.spotlightSlide}>
              <article className={styles.heroTile}>
                <div className={`${styles.heroTileInner} ${TILE_WASHES[i % TILE_WASHES.length]}`}>
                  <Link
                    href={routes.post(post.slug)}
                    className={`${styles.heroTileMedia}${post.cover ? "" : ` pastel-${getCategory(post.category).pastel}`}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {post.cover ? (
                      <Image src={post.cover.src} alt="" fill sizes="(max-width: 900px) 82vw, 46vw" priority={i === 0} className={styles.coverImg} />
                    ) : null}
                  </Link>
                  <div className={styles.heroTileBody}>
                    <h2 className={styles.heroTileTitle}>{post.title}</h2>
                    <p className={styles.heroTileDesc}>{post.description}</p>
                    <p className={styles.heroTileMeta}>By {post.author.name} · {formatDate(post.date)} · {post.readingMinutes} min read</p>
                    <Link href={routes.post(post.slug)} className={styles.heroTileCta}>
                      Read article
                      <ReadArrow />
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className={scrollable ? styles.catControls : `${styles.catControls} ${styles.catControlsHidden}`}>
          <div className={styles.catArrows}>
            <button type="button" className={styles.catArrow} onClick={() => go(-1)} disabled={atStart} aria-label="Previous featured stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className={styles.catArrow} onClick={() => go(1)} disabled={atEnd} aria-label="More featured stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <span className={styles.catProgress} aria-hidden="true">
            <span className={styles.catProgressFill} style={{ transform: `scaleX(${Math.max(progress, 0.12)})` }} />
          </span>
        </div>
      </section>
    );
  }

  /* Tall editorial cards — image on top, copy inside a white sheet with a
     date + circular arrow foot, like blog.google's "What's new" rail. */
  if (variant === "journal") {
    return (
      <section
        id={anchor}
        className={styles.personal}
        aria-labelledby={title ? id : undefined}
        aria-label={title ? ariaLabel : id}
      >
        {title ? (
          <div className={styles.catHead}>
            <div>
              <h2 id={id} className={styles.bandTitle}>{title}</h2>
              {subtitle ? <p className={styles.catSubtitle}>{subtitle}</p> : null}
            </div>
            {moreLabel ? (
              <Link href={href} className={styles.catMore}>
                {moreLabel}
                <ReadArrow />
              </Link>
            ) : null}
          </div>
        ) : null}

        <ul className={styles.journalTrack} ref={trackRef} onScroll={sync}>
          {posts.slice(0, limit).map((post, i) => (
            <li key={post.slug} className={styles.journalItem}>
              <Link
                href={routes.post(post.slug)}
                className={`${styles.journalCard} ${TILE_WASHES[i % TILE_WASHES.length]}`}
              >
                <span className={styles.journalText}>
                  <span className={styles.journalKicker}>{getCategory(post.category).name}</span>
                  <span className={styles.journalTitle}>{post.title}</span>
                  <span className={styles.journalDesc}>{post.description}</span>
                  <span className={styles.journalFoot}>
                    <span className={styles.journalByline}>By {post.author.name}</span>
                    <span className={styles.journalMore}>
                      Read more
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </span>
                <span className={`${styles.journalPhoto}${post.cover ? "" : ` pastel-${getCategory(post.category).pastel}`}`}>
                  {post.cover ? (
                    <Media post={post} sizes="(max-width: 760px) 82vw, 560px" className={styles.coverImg} eager={i === 0} />
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className={scrollable ? styles.catControls : `${styles.catControls} ${styles.catControlsHidden}`}>
          <div className={styles.catArrows}>
            <button type="button" className={styles.catArrow} onClick={() => go(-1)} disabled={atStart} aria-label="Previous journal stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className={styles.catArrow} onClick={() => go(1)} disabled={atEnd} aria-label="More journal stories">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <span className={styles.catProgress} aria-hidden="true">
            <span className={styles.catProgressFill} style={{ transform: `scaleX(${Math.max(progress, 0.12)})` }} />
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      id={anchor}
      className={`${styles.personal}${variant === "tinted" ? ` ${styles.personalTinted}` : ""}`}
      aria-labelledby={title ? id : undefined}
      aria-label={title ? ariaLabel : id}
    >
      {title ? (
        <div className={styles.catHead}>
          <div>
            <h2 id={id} className={styles.bandTitle}>{title}</h2>
            {subtitle ? <p className={styles.catSubtitle}>{subtitle}</p> : null}
          </div>
          {moreLabel ? (
            <Link href={href} className={styles.catMore}>
              {moreLabel}
              <ReadArrow />
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className={styles.personalTrack} ref={trackRef} onScroll={sync}>
        {posts.slice(0, limit).map((post) => (
          <li key={post.slug} className={styles.personalItem}>
            <Link
              href={routes.post(post.slug)}
              className={`${styles.personalCard}${variant === "tinted" ? ` ${styles.cardTinted}` : ""}`}
            >
              <span className={`${styles.personalMedia}${post.cover ? "" : ` pastel-${getCategory(post.category).pastel}`}`}>
                <Media post={post} sizes="(max-width: 760px) 82vw, 340px" className={styles.coverImg} />
              </span>
              <span className={styles.personalBody}>
                <span className={styles.compactEyebrow}>{getCategory(post.category).name}</span>
                <span className={styles.personalTitle}>{post.title}</span>
                <span className={styles.compactByline}>
                  {post.readingMinutes} min read · By {post.author.name}
                </span>
                <span className={styles.personalCta}>
                  Read article
                  <ReadArrow />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={scrollable ? styles.catControls : `${styles.catControls} ${styles.catControlsHidden}`}>
        <div className={styles.catArrows}>
          <button type="button" className={styles.catArrow} onClick={() => go(-1)} disabled={atStart} aria-label="Previous stories">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button type="button" className={styles.catArrow} onClick={() => go(1)} disabled={atEnd} aria-label="More stories">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <span className={styles.catProgress} aria-hidden="true">
          <span className={styles.catProgressFill} style={{ transform: `scaleX(${Math.max(progress, 0.12)})` }} />
        </span>
      </div>
    </section>
  );
}
