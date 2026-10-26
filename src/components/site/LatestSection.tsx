"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { shortDate } from "@/lib/dates";
import { Reveal } from "@/components/ui/Reveal";
import { LatestCard } from "./sections";
import styles from "./LatestSection.module.scss";

const PAGE = 6;

export function LatestSection({
  posts,
  topics,
  title = "The latest",
  variant = "feed",
}: {
  posts: Post[];
  topics: { slug: string; name: string }[];
  title?: string;
  variant?: "feed" | "grid";
}) {
  const [topic, setTopic] = useState("all");
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(
    () => (topic === "all" ? posts : posts.filter((p) => p.category === topic)),
    [posts, topic],
  );
  const shown = filtered.slice(0, visible);

  const rail = (
    <aside className={styles.rail}>
      <h2 className="section-title">{title}</h2>
      <p className={styles.railLabel}>Sort by topic</p>
      <div className={styles.topicPills} role="group" aria-label="Sort by topic">
        <button
          type="button"
          className={`pill ${topic === "all" ? "pill-active" : ""}`}
          onClick={() => { setTopic("all"); setVisible(PAGE); }}
          aria-pressed={topic === "all"}
        >
          All News
        </button>
        {topics.map((t) => (
          <button
            key={t.slug}
            type="button"
            className={`pill ${topic === t.slug ? "pill-active" : ""}`}
            onClick={() => { setTopic(t.slug); setVisible(PAGE); }}
            aria-pressed={topic === t.slug}
          >
            {t.name}
          </button>
        ))}
      </div>
    </aside>
  );

  if (variant === "grid") {
    return (
      <div className={styles.section}>
        <h2 className={styles.gridTitle}>{title}</h2>
        {shown.length > 0 ? (
          <div className={styles.grid}>
            {shown.map((post, i) => (
              <Reveal key={post.slug} delay={(i % 3) * 80}>
                <LatestCard post={post} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Nothing published yet — the first post will land right here.</p>
        )}
        {filtered.length > shown.length ? (
          <div className={styles.loadMoreRow}>
            <button type="button" className={`${styles.loadMore} btn btn-ghost`} onClick={() => setVisible((v) => v + PAGE)}>
              Load more stories
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.layout}>
        {rail}
        <div className={styles.feed}>
          {shown.map((post, i) => (
            <Reveal key={post.slug} delay={Math.min(i, 3) * 70}>
            <Link href={`/blog/${post.slug}`} className={styles.feedItem}>
              <div className={styles.feedMedia}>
                {post.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover.src} alt="" loading="lazy" />
                ) : null}
              </div>
              <div className={styles.feedText}>
                <span className={`${styles.feedChip} pill pill-soft`}>{topicName(post, topics)}</span>
                <h3 className={styles.feedTitle}>{post.title}</h3>
                <p className={styles.feedByline}>
                  {shortDate(post.date)} · {post.readingMinutes} min read
                </p>
              </div>
            </Link>
            </Reveal>
          ))}
          {shown.length === 0 ? (
            <p className={styles.empty}>No stories in this topic yet.</p>
          ) : null}
          {filtered.length > shown.length ? (
            <div className={styles.loadMoreRow}>
              <button type="button" className={`${styles.loadMore} btn btn-ghost`} onClick={() => setVisible((v) => v + PAGE)}>
                Explore more articles
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function topicName(post: Post, topics: { slug: string; name: string }[]) {
  return topics.find((t) => t.slug === post.category)?.name ?? post.category;
}
