"use client";

import Link from "next/link";
import { api, useApiCollection, type ApiPost, type ApiSubscriber, type ApiTopic } from "@/components/admin/api";
import { useEffect, useState } from "react";
import { Card, CardHead, PageHeader, StatusChip, statusTone } from "@/components/admin/kit";
import { formatDate } from "@/lib/dates";
import styles from "./dashboard.module.scss";

export default function AdminOverview() {
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const subsC = useApiCollection<ApiSubscriber>("/api/admin/subscribers", "subscribers");
  const topicsC = useApiCollection<ApiTopic>("/api/admin/topics", "topics");
  type Analytics = { totalViews: number; top: { title: string; slug: string; views: number }[]; byDay?: Record<string, number> };
  const [analytics, setAnalytics] = useState<Analytics>({ totalViews: 0, top: [], byDay: {} });
  const [analyticsError, setAnalyticsError] = useState("");
  useEffect(() => {
    api
      .get<Analytics>("/api/admin/analytics?days=30")
      .then(setAnalytics)
      .catch((e: unknown) => setAnalyticsError(e instanceof Error ? e.message : "Analytics unavailable"));
  }, []);

  const loadError = postsC.error || topicsC.error || subsC.error || analyticsError;
  // Same phrases isMissingSchema() checks server-side: only a truly absent
  // schema should tell the editor to run supabase.sql.
  const needsSetup = /does not exist|Could not find the table|schema cache|PGRST205|42P01/i.test(loadError);
  const state = {
    posts: postsC.items.map((p) => ({ id: p.id, title: p.title, slug: p.slug, status: p.status, date: String(p.date).slice(0,10), cover: p.cover_url, tags: p.tags ?? [], category: p.topic_slug ?? "", authorId: p.author_id ?? "", views: analytics.top.find((t) => t.slug === p.slug)?.views ?? 0, updatedAt: String(p.updated_at ?? p.date), blocks: [] as unknown[] })),
    subscribers: subsC.items.map((s) => ({ id: s.id, email: s.email, name: s.name || s.email.split("@")[0], status: s.status, joined: String(s.joined_at).slice(0,10) })),
    topics: topicsC.items.map((t) => ({ slug: t.slug, name: t.name, color: t.color })),
  };
  const published = state.posts.filter((p) => p.status === "published");
  const drafts = state.posts.filter((p) => p.status === "draft" || p.status === "review");
  const scheduled = state.posts.filter((p) => p.status === "scheduled");
  const subs = state.subscribers.filter((s) => s.status === "subscribed");
  const publishedThisMonth = published.filter((p) => p.date.startsWith(new Date().toISOString().slice(0, 7))).length;
  const viewDays = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (29 - i));
    return date.toISOString().slice(0, 10);
  });
  const viewSeries = viewDays.map((day) => analytics.byDay?.[day] ?? 0);

  const byTopic = state.topics
    .map((t) => ({ ...t, n: state.posts.filter((p) => p.category === t.slug).length }))
    .sort((a, b) => b.n - a.n);
  const maxTopic = Math.max(1, ...byTopic.map((t) => t.n));

  const recent = [...state.posts].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="What is happening across the blog right now."
        actions={
          <>
            <Link href="/" target="_blank" rel="noreferrer noopener" className="btn btn-ghost">View site</Link>
            <Link href="/admin/posts/new" className="btn btn-primary">New post</Link>
          </>
        }
      />

      {loadError ? (
        <div className={styles.setup} role="alert">
          <p className={styles.setupTitle}>{needsSetup ? "The database schema has not been created yet" : "Some data could not be loaded"}</p>
          <p className={styles.setupBody}>
            {needsSetup
              ? "Run supabase.sql in the Supabase SQL editor once. It creates the fn_* tables, policies and seed rows, then reload this page."
              : loadError}
          </p>
        </div>
      ) : null}

      <div className={styles.stats}>
        <StatCard label="Published" value={published.length} trend={`${publishedThisMonth} this month`} tone="green" href="/admin/posts" />
        <StatCard label="In draft" value={drafts.length} trend="In progress" tone="yellow" href="/admin/posts" />
        <StatCard label="Scheduled" value={scheduled.length} trend="Queued" tone="blue" href="/admin/posts" />
        <StatCard label="Subscribers" value={subs.length} trend="Active" tone="blue" href="/admin/subscribers" />
      </div>

      <div className={styles.grid}>
        <Card className={styles.wide}>
          <CardHead
            title="Recent activity"
            action={<Link href="/admin/posts" className="btn-link">All posts</Link>}
          />
          <ul className={styles.activity}>
            {recent.map((post) => (
              <li key={post.id}>
                <span className={styles.activityThumb}>
                  {post.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover} alt="" />
                  ) : null}
                </span>
                <div className={styles.activityText}>
                  <Link href={`/admin/posts/${post.id}/edit`} className={styles.activityTitle}>
                    {post.title}
                  </Link>
                  <span className={styles.activityMeta}>
                    {post.status === "published" ? "Published" : "Updated"} {formatDate(post.updatedAt)} ·{" "}
                    {post.status === "published" ? `${post.views.toLocaleString()} views` : post.status}
                  </span>
                </div>
                <StatusChip status={post.status} tone={statusTone(post.status)} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead title="Stories by topic" action={<Link href="/admin/topics" className="btn-link">Manage</Link>} />
          <ul className={styles.bars}>
            {byTopic.map((t) => (
              <li key={t.slug}>
                <span className={styles.barLabel}>{t.name}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${(t.n / maxTopic) * 100}%`, background: t.color }} />
                </span>
                <span className={styles.barValue}>{t.n}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead title="Total reads" action={<span className={styles.muted}>Last 30 days</span>} />
          <div className={styles.reads}>
            {analyticsError ? (
              <span className={styles.readsFoot}>Analytics unavailable: {analyticsError}</span>
            ) : (
              <>
                <span className={styles.readsValue}>{analytics.totalViews.toLocaleString()}</span>
                <Sparkline points={viewSeries} />
                <span className={styles.readsFoot}>Across published posts</span>
              </>
            )}
          </div>
        </Card>

        <Card className={styles.wide}>
          <CardHead
            title="Latest subscribers"
            action={<Link href="/admin/subscribers" className="btn-link">View all</Link>}
          />
          <ul className={styles.subs}>
            {state.subscribers.slice(0, 4).map((s) => (
              <li key={s.id}>
                <span className={styles.avatar}>{s.name.split(" ").map((x) => x[0]).join("")}</span>
                <div>
                  <p className={styles.subName}>{s.name}</p>
                  <p className={styles.subMail}>{s.email}</p>
                </div>
                <span className={styles.subDate}>{formatDate(s.joined)}</span>
                <StatusChip status={s.status} tone={statusTone(s.status)} />
              </li>
            ))}
          </ul>
          <div className={styles.ctaRow}>
            <Link href="/admin/subscribers" className="btn-link">Manage subscribers</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  tone,
  href,
}: {
  label: string;
  value: number;
  trend: string;
  tone: "green" | "yellow" | "blue";
  href: string;
}) {
  return (
    <Link href={href} className={`${styles.stat} ${styles[`stat-${tone}`]}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={`${styles.statTrend} ${styles[`trend-${tone}`]}`}>{trend}</span>
    </Link>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 320;
  const h = 72;
  const pts = points.length ? points : [0];
  const max = Math.max(1, ...pts);
  const path = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * w},${h - (v / max) * (h - 8) - 4}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="72" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${path} L${w},${h} L0,${h} Z`} fill="var(--blue-50)" />
      <path d={path} fill="none" stroke="var(--blue-600)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
