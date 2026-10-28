import { adminRoute, body, db, json, slug, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const { data: series, error } = await db.from("fn_series").select("*").order("created_at");
  if (error) return json({ error: error.message }, 500);
  const { data: links } = await db.from("fn_series_posts").select("series_id, post_id, position").order("position");
  const memberIds = new Map<string, string[]>();
  for (const l of links ?? []) {
    const sid = l.series_id as string;
    if (!memberIds.has(sid)) memberIds.set(sid, []);
    memberIds.get(sid)!.push(l.post_id as string);
  }
  return json({
    series: (series ?? []).map((s) => ({ ...s, posts: (memberIds.get(s.id as string) ?? []).length, post_ids: memberIds.get(s.id as string) ?? [] })),
  });
});

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const title = str(b.title, 160)?.trim();
  if (!title) return json({ error: "title is required" }, 400);
  const seriesSlug = slug(b.slug, 160) || slug(title, 160) || `series-${Date.now()}`;
  const payload = {
    title,
    slug: seriesSlug,
    description: str(b.description, 600)?.trim() ?? "",
    cover_url: str(b.cover_url, 2000)?.trim() || null,
    status: b.status === "draft" ? "draft" : "live",
  };
  const { data, error } = await db.from("fn_series").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);

  const ids = Array.isArray(b.post_ids) ? (b.post_ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
  if (ids.length) {
    const { error: linkError } = await db
      .from("fn_series_posts")
      .insert(ids.map((post_id, i) => ({ series_id: data.id, post_id, position: i })));
    if (linkError) return json({ error: linkError.message }, 400);
  }
  return json({ series: data }, 201);
});
