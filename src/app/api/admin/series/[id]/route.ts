import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await body(req);
  const patch: Record<string, unknown> = {};
  if (typeof b.title === "string" && b.title.trim()) patch.title = b.title.trim().slice(0, 200);
  if (typeof b.slug === "string" && b.slug.trim()) {
    const cleanSlug = b.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
    if (cleanSlug) patch.slug = cleanSlug;
  }
  if (typeof b.description === "string") patch.description = b.description.trim().slice(0, 1000);
  if (b.status === "live" || b.status === "draft") patch.status = b.status;
  if (!Object.keys(patch).length && !("post_ids" in b)) return json({ error: "no fields" }, 400);

  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data: series, error: seriesError } = await db.from("fn_series").select("id").eq(col, id).maybeSingle();
  if (seriesError) return json({ error: seriesError.message }, 400);
  if (!series) return json({ error: "Not found" }, 404);

  if (Object.keys(patch).length) {
    const { error } = await db.from("fn_series").update(patch).eq("id", series.id);
    if (error) return json({ error: error.message }, 400);
  }

  if ("post_ids" in b) {
    if (!Array.isArray(b.post_ids)) return json({ error: "post_ids must be an array" }, 400);
    const ids = [...new Set(b.post_ids.filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)))].slice(0, 100);
    const { data: existing, error: postsError } = ids.length
      ? await db.from("fn_posts").select("id").in("id", ids)
      : { data: [], error: null };
    if (postsError) return json({ error: postsError.message }, 400);
    const found = new Set((existing ?? []).map((post: { id: string }) => post.id));
    if (found.size !== ids.length) return json({ error: "One or more posts do not exist" }, 400);
    const { error: deleteError } = await db.from("fn_series_posts").delete().eq("series_id", series.id);
    if (deleteError) return json({ error: deleteError.message }, 400);
    if (ids.length) {
      const { error } = await db
        .from("fn_series_posts")
        .insert(ids.map((post_id, position) => ({ series_id: series.id, post_id, position })));
      if (error) return json({ error: error.message }, 400);
    }
  }

  const { data, error } = await db.from("fn_series").select("*").eq("id", series.id).single();
  if (error) return json({ error: error.message }, 500);
  const { data: links } = await db.from("fn_series_posts").select("post_id, position").eq("series_id", series.id).order("position");
  return json({ series: { ...data, post_ids: (links ?? []).map((link: { post_id: string }) => link.post_id) } });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { error } = await db.from("fn_series").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
