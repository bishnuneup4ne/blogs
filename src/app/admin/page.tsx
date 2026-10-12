"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuSquarePen,
  LuVideo,
  LuTag,
  LuSettings,
  LuEye,
  LuUsers,
  LuClock,
  LuMail,
  LuFlame,
  LuTrendingUp,
} from "react-icons/lu";

interface Stats {
  published: number;
  drafts: number;
  subscribers: number;
  activeSubscribers: number;
}

interface Analytics {
  missingTable: boolean;
  totals: {
    views: number;
    uniqueVisitors: number;
    avgReadSeconds: number;
    engagedViews: number;
    todayViews: number;
    last7Views: number;
  };
  daily: { date: string; views: number; visitors: number }[];
  topPosts: { slug: string; views: number; avgReadSeconds: number }[];
  countries: { country: string; views: number; visitors: number }[];
  devices: { desktop: number; mobile: number; tablet: number };
}

function fmtDuration(sec: number): string {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function flag(code: string): string {
  if (code.length !== 2) return "🏳️";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  );
}

function ViewsChart({ daily }: { daily: Analytics["daily"] }) {
  const w = 560;
  const h = 180;
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...daily.map((d) => d.views));
  const bw = (w - pad.l - pad.r) / Math.max(1, daily.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="admin-chart" role="img" aria-label="Views per day, last 14 days">
      {daily.map((d, i) => {
        const bh = Math.round(((h - pad.t - pad.b) * d.views) / max);
        const x = pad.l + i * bw;
        const y = h - pad.b - bh;
        return (
          <g key={d.date}>
            <rect x={x + 3} y={pad.t} width={bw - 6} height={h - pad.t - pad.b} rx={4} fill="transparent">
              <title>{`${d.date}: ${d.views} views, ${d.visitors} visitors`}</title>
            </rect>
            <rect x={x + 3} y={y} width={bw - 6} height={Math.max(2, bh)} rx={4} className="admin-chart-bar" />
            {(i === 0 || i === daily.length - 1 || i % 7 === 0) && (
              <text x={x + bw / 2} y={h - 6} textAnchor="middle" className="admin-chart-label">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [statsRes, anRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/admin/analytics", { credentials: "include" }),
      ]);
      if (cancelled) return;
      if (statsRes.ok) setStats(await statsRes.json());
      if (anRes.ok) setAnalytics(await anRes.json());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = analytics?.totals;

  return (
    <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Dashboard</h1>
            <p className="admin-page-subtitle">
              Reader activity, engagement and content overview
            </p>
          </div>
          <Link href="/admin/writeups/new" className="btn btn-primary">
            + New Writeup
          </Link>
        </div>

        {analytics?.missingTable && (
          <div className="admin-alert admin-alert-error">
            Analytics table not found. Run <strong>supabase.analytics.sql</strong> in the
            Supabase SQL editor once to enable read tracking.
          </div>
        )}

        <div className="admin-quick-grid">
          <Link href="/admin/writeups/new" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuSquarePen size={18} />
            </span>
            <strong>New writeup</strong>
            <small>Blog post</small>
          </Link>
          <Link href="/admin/writeups/new?mode=video" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuVideo size={18} />
            </span>
            <strong>New video</strong>
            <small>Personal tab</small>
          </Link>
          <Link href="/admin/categories" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuTag size={18} />
            </span>
            <strong>Categories</strong>
            <small>Flow map nav</small>
          </Link>
          <Link href="/admin/settings" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuSettings size={18} />
            </span>
            <strong>Settings</strong>
            <small>Site config</small>
          </Link>
        </div>

        <div className="admin-stats-grid">
          <div className="admin-stat-card views">
            <div className="admin-stat-number">{totals ? totals.views.toLocaleString() : "—"}</div>
            <div className="admin-stat-label">Views (30 days)</div>
          </div>
          <div className="admin-stat-card visitors">
            <div className="admin-stat-number">{totals ? totals.uniqueVisitors.toLocaleString() : "—"}</div>
            <div className="admin-stat-label">Unique visitors</div>
          </div>
          <div className="admin-stat-card readtime">
            <div className="admin-stat-number">{totals ? fmtDuration(totals.avgReadSeconds) : "—"}</div>
            <div className="admin-stat-label">Avg read time</div>
          </div>
          <div className="admin-stat-card published">
            <div className="admin-stat-number">{stats ? stats.published : "—"}</div>
            <div className="admin-stat-label">Published</div>
          </div>
          <div className="admin-stat-card draft">
            <div className="admin-stat-number">{stats ? stats.drafts : "—"}</div>
            <div className="admin-stat-label">Drafts</div>
          </div>
          <div className="admin-stat-card subscribers-count">
            <div className="admin-stat-number">{stats ? stats.activeSubscribers.toLocaleString() : "—"}</div>
            <div className="admin-stat-label">Subscribers</div>
          </div>
        </div>

        <div className="admin-grid-2">
          <div className="admin-card">
            <h2 className="admin-section-title">
              <LuTrendingUp size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              Views — last 14 days
            </h2>
            {analytics && analytics.daily.length > 0 ? (
              <ViewsChart daily={analytics.daily} />
            ) : (
              <p className="text-muted">{loading ? "Loading…" : "No views recorded yet."}</p>
            )}
            {totals && (
              <p className="text-muted text-small" style={{ margin: "8px 0 0" }}>
                {totals.todayViews} today · {totals.last7Views} in the last 7 days ·{" "}
                {totals.engagedViews} engaged reads (&gt;30s) in 30 days
              </p>
            )}
          </div>

          <div className="admin-card">
            <h2 className="admin-section-title">
              <LuEye size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              Top posts
            </h2>
            {analytics && analytics.topPosts.length > 0 ? (
              analytics.topPosts.map((p) => (
                <div className="admin-list-row" key={p.slug}>
                  <Link
                    href={`/blogs/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-truncate"
                    style={{ color: "var(--violet)", textDecoration: "none", maxWidth: 200 }}
                  >
                    {p.slug}
                  </Link>
                  <span className="text-muted text-small">
                    {p.views} views · <LuClock size={11} style={{ verticalAlign: -1 }} /> {fmtDuration(p.avgReadSeconds)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted">{loading ? "Loading…" : "No data yet."}</p>
            )}
          </div>
        </div>

        <div className="admin-grid-2">
          <div className="admin-card">
            <h2 className="admin-section-title">
              <LuUsers size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              Readers by location
            </h2>
            {analytics && analytics.countries.length > 0 ? (
              analytics.countries.map((c) => {
                const maxV = analytics.countries[0].views || 1;
                return (
                  <div className="admin-list-row" key={c.country}>
                    <span style={{ minWidth: 90 }}>
                      {flag(c.country)} {c.country}
                    </span>
                    <span className="admin-bar-track">
                      <span className="admin-bar-fill" style={{ width: `${(c.views / maxV) * 100}%` }} />
                    </span>
                    <span className="text-muted text-small" style={{ minWidth: 90, textAlign: "right" }}>
                      {c.views} views · {c.visitors} readers
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted">{loading ? "Loading…" : "No location data yet."}</p>
            )}
          </div>

          <div className="admin-card">
            <h2 className="admin-section-title">
              <LuFlame size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              Devices &amp; audience
            </h2>
            {analytics && (
              <>
                {(["desktop", "mobile", "tablet"] as const).map((k) => {
                  const total =
                    analytics.devices.desktop + analytics.devices.mobile + analytics.devices.tablet || 1;
                  return (
                    <div className="admin-list-row" key={k}>
                      <span style={{ minWidth: 70, textTransform: "capitalize" }}>{k}</span>
                      <span className="admin-bar-track">
                        <span
                          className="admin-bar-fill"
                          style={{ width: `${(analytics.devices[k] / total) * 100}%` }}
                        />
                      </span>
                      <span className="text-muted text-small" style={{ minWidth: 40, textAlign: "right" }}>
                        {analytics.devices[k]}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            <div className="admin-list-row" style={{ marginTop: 12 }}>
              <span>
                <LuMail size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
                Newsletter
              </span>
              <Link href="/admin/subscribers" className="btn btn-ghost btn-sm">
                {stats ? `${stats.activeSubscribers} active` : "View"}
              </Link>
            </div>
          </div>
        </div>
    </main>
  );
}
