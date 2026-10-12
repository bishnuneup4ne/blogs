import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { cachedQuery } from "@/lib/apiCache";

interface ViewRow {
  slug: string;
  visitor_id: string | null;
  country: string | null;
  device: string | null;
  read_seconds: number | null;
  max_scroll: number | null;
  created_at: string;
}

export interface AnalyticsSummary {
  missingTable: boolean;
  totals: {
    views: number;
    uniqueVisitors: number;
    avgReadSeconds: number;
    engagedViews: number; // >30s reads
    todayViews: number;
    last7Views: number;
  };
  daily: { date: string; views: number; visitors: number }[];
  topPosts: { slug: string; views: number; avgReadSeconds: number }[];
  countries: { country: string; views: number; visitors: number }[];
  devices: { desktop: number; mobile: number; tablet: number };
}

const DAY_MS = 86_400_000;

function emptySummary(missingTable = false): AnalyticsSummary {
  return {
    missingTable,
    totals: { views: 0, uniqueVisitors: 0, avgReadSeconds: 0, engagedViews: 0, todayViews: 0, last7Views: 0 },
    daily: [],
    topPosts: [],
    countries: [],
    devices: { desktop: 0, mobile: 0, tablet: 0 },
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await cachedQuery<AnalyticsSummary>("admin:analytics", 60_000, async () => {
    const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
    const { data: rows, error: qErr } = await supabaseAdmin
      .from("page_views")
      .select("slug, visitor_id, country, device, read_seconds, max_scroll, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10_000);

    if (qErr) {
      // Table not created yet → zeros instead of a 500.
      if (qErr.code === "42P01" || qErr.code === "PGRST205") {
        return { data: emptySummary(true), error: null };
      }
      return { data: null, error: { message: qErr.message } };
    }

    const summary = emptySummary();
    const visitors = new Set<string>();
    const todayKey = new Date().toISOString().slice(0, 10);
    const day7 = Date.now() - 7 * DAY_MS;
    const perDay = new Map<string, { views: number; visitors: Set<string> }>();
    const perPost = new Map<string, { views: number; readSum: number }>();
    const perCountry = new Map<string, { views: number; visitors: Set<string> }>();

    for (const r of (rows ?? []) as ViewRow[]) {
      summary.totals.views += 1;
      if (r.visitor_id) visitors.add(r.visitor_id);
      const read = r.read_seconds ?? 0;
      if (read > 30) summary.totals.engagedViews += 1;
      summary.totals.avgReadSeconds += read;

      const day = (r.created_at || "").slice(0, 10);
      if (day === todayKey) summary.totals.todayViews += 1;
      if (r.created_at && Date.parse(r.created_at) >= day7) summary.totals.last7Views += 1;

      if (!perDay.has(day)) perDay.set(day, { views: 0, visitors: new Set() });
      const d = perDay.get(day)!;
      d.views += 1;
      if (r.visitor_id) d.visitors.add(r.visitor_id);

      const p = perPost.get(r.slug) ?? { views: 0, readSum: 0 };
      p.views += 1;
      p.readSum += read;
      perPost.set(r.slug, p);

      if (r.country) {
        const c = perCountry.get(r.country) ?? { views: 0, visitors: new Set<string>() };
        c.views += 1;
        if (r.visitor_id) c.visitors.add(r.visitor_id);
        perCountry.set(r.country, c);
      }

      if (r.device === "mobile") summary.devices.mobile += 1;
      else if (r.device === "tablet") summary.devices.tablet += 1;
      else summary.devices.desktop += 1;
    }

    summary.totals.uniqueVisitors = visitors.size;
    summary.totals.avgReadSeconds =
      summary.totals.views > 0 ? Math.round(summary.totals.avgReadSeconds / summary.totals.views) : 0;

    // Fill in the last 14 days so the chart has no gaps.
    for (let i = 13; i >= 0; i--) {
      const key = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      const entry = perDay.get(key);
      summary.daily.push({ date: key, views: entry?.views ?? 0, visitors: entry?.visitors.size ?? 0 });
    }

    summary.topPosts = [...perPost.entries()]
      .map(([slug, v]) => ({
        slug,
        views: v.views,
        avgReadSeconds: Math.round(v.readSum / v.views),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    summary.countries = [...perCountry.entries()]
      .map(([country, v]) => ({ country, views: v.views, visitors: v.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return { data: summary, error: null };
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
