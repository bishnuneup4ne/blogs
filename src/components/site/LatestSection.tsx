"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import {relativeDate} from "@/lib/dates";
import { Reveal } from "@/components/ui/Reveal";
import { UpdateCard } from "./sections";
import styles from "./LatestSection.module.scss";

/* First paint shows `initial`; the explore button adds `step` each time. */
const DEFAULT_INITIAL = 9;
const DEFAULT_STEP = 6;

export function LatestSection({
 posts,
 topics,
 title = "The latest",
 variant = "feed",
 excludeSlugs = [],
 hideTitle = false,
 markFirst = false,
 initial = DEFAULT_INITIAL,
 step = DEFAULT_STEP,
}: {
 posts: Post[];
 topics: { slug: string; name: string }[];
 title?: string;
 variant?: "feed" | "grid";
 excludeSlugs?: string[];
 hideTitle?: boolean;
 markFirst?: boolean;
 initial?: number;
 step?: number;
}) {
 const [topic, setTopic] = useState("all");
 const [author, setAuthor] = useState("all");
 const [visible, setVisible] = useState(initial);

 const pool = posts;
 const authors = useMemo(() => {
  const seen = new Map<string, string>();
  pool.forEach((p) => { if (p.author?.name) seen.set(p.author.name, p.author.name); });
  return [...seen.keys()].sort();
 }, [pool]);

 const filtered = useMemo(
  () =>
   pool
    .filter((p) => topic === "all" || p.category === topic)
    .filter((p) => author === "all" || p.author?.name === author),
  [pool, topic, author],
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
     onClick={() => { setTopic("all"); setVisible(initial); }}
     aria-pressed={topic === "all"}
    >
     All News
    </button>
    {topics.map((t) => (
     <button
      key={t.slug}
      type="button"
      className={`pill ${topic === t.slug ? "pill-active" : ""}`}
      onClick={() => { setTopic(t.slug); setVisible(initial); }}
      aria-pressed={topic === t.slug}
     >
      {t.name}
     </button>
    ))}
   </div>
   {authors.length > 1 ? (
    <>
     <p className={styles.railLabel}>By author</p>
     <div className={styles.topicPills} role="group" aria-label="Filter by author">
      <button
       type="button"
       className={`pill ${author === "all" ? "pill-active" : ""}`}
       onClick={() => { setAuthor("all"); setVisible(initial); }}
       aria-pressed={author === "all"}
      >
       Everyone
      </button>
      {authors.map((name) => (
       <button
        key={name}
        type="button"
        className={`pill ${author === name ? "pill-active" : ""}`}
        onClick={() => { setAuthor(name); setVisible(initial); }}
        aria-pressed={author === name}
       >
        {name}
       </button>
      ))}
     </div>
    </>
   ) : null}
  </aside>
 ); if (variant === "grid") {
  return (
   <div className={styles.section}>
    {!hideTitle ? <h2 className={styles.gridTitle}>{title}</h2> : null}
    {shown.length > 0 ? (
     <ul className={styles.grid}>
      {shown.map((post, i) => (
       <Reveal as="li" key={post.slug} delay={(i % 3) * 80}>
        <UpdateCard post={post} showByline={authors.length > 1} />
       </Reveal>
      ))}
     </ul>
    ) : pool.length === 0 ? (
     <p className={styles.empty}>Nothing published yet — the first post will land right here.</p>
    ) : (
     <p className={styles.empty}>No posts in this topic yet. Try “All News” or publish more.</p>
    )}
    {filtered.length > shown.length ? (
     <div className={styles.loadMoreRow}>
      <button type="button" className={`${styles.loadMore} btn btn-ghost`} onClick={() => setVisible((v) => Math.min(v + step, filtered.length))}>
       Load more stories
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
       </svg>
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
      <Reveal as="li" key={post.slug} delay={Math.min(i, 3) * 70}>
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
                   {authors.length > 1 && post.author?.name ? `By ${post.author.name} · ` : ""}
                   {relativeDate(post.date)} · {post.readingMinutes} min read
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
       <button type="button" className={`${styles.loadMore} btn btn-ghost`} onClick={() => setVisible((v) => Math.min(v + step, filtered.length))}>
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
