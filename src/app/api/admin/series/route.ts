import { adminRoute, body, db, json, slug, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function postIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 100);
}

export const GET = adminRoute(async () => {
  const [{ data: series, error }, { data: links }] = await Promise.all([
    db.from("fn_series").select("*").order("created_at", { ascending: false }),
    db.from("fn_series_posts").select("series_id, post_id, position").order("position"),
  ]);
  if (error) return json({ error: error.message }, 500);
  return json({
    series: (series ?? []).map((s: any) => {
      const ids = (links ?? []).filter((l: any) => l.series_id === s.id).map((l: any) => l.post_id);
      return { ...s, posts: ids.length, post_ids: ids };
    }),
  });
});

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const title = str(b.title, 200)?.trim();
  if (!title) return json({ error: "title is required" }, 400);
  const payload = {
    title,
    slug: slug(b.slug, 200) || slug(title, 200) || `series-${Date.now()}`,
    description: str(b.description, 1000)?.trim() ?? "",
    status: b.status === "live" ? "live" : "draft",
  };
  const { data, error } = await db.from("fn_series").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);
  const ids = postIds(b.post_ids);
  let linked: string[] = [];
  if (ids.length) {
    const { data: existing } = await db.from("fn_posts").select("id").in("id", ids);
    const found = new Set((existing ?? []).map((p: { id: string }) => p.id));
    linked = ids.filter((id) => found.has(id));
    if (linked.length) {
      const { error: linkError } = await db
        .from("fn_series_posts")
        .insert(linked.map((post_id, position) => ({ series_id: data.id, post_id, position })));
      if (linkError) return json({ error: linkError.message }, 400);
    }
  }
  return json({ series: { ...data, post_ids: linked } }, 201);
});
