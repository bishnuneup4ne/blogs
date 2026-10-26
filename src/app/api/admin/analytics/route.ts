import { adminRoute, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async (req) => {
  const requested = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 365) : 30;
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const [{ data: views }, { data: posts }] = await Promise.all([
    db.from("fn_post_views").select("post_id, day, views").gte("day", since),
    db.from("fn_posts").select("id, title, slug, date"),
  ]);
  const byPost = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const v of views ?? []) {
    byPost.set(v.post_id, (byPost.get(v.post_id) ?? 0) + Number(v.views));
    byDay.set(v.day, (byDay.get(v.day) ?? 0) + Number(v.views));
  }
  const postInfo = new Map((posts ?? []).map((p: any) => [p.id, p]));
  const top = [...byPost.entries()]
    .map(([id, n]) => ({ ...(postInfo.get(id) ?? { title: "?", slug: "?" }), views: n }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  return json({ totalViews: [...byDay.values()].reduce((a, b) => a + b, 0), byDay: Object.fromEntries(byDay), top });
});
