import { adminRoute, body, db, json, slug, str } from "@/lib/api-helpers";
import { recordRewrite } from "@/lib/rewrites";

export const dynamic = "force-dynamic";

async function resolveId(id: string): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/i.test(id)) return id;
  const { data } = await db.from("fn_series").select("id").eq("slug", id).maybeSingle();
  return data?.id ?? null;
}

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const rowId = await resolveId(id);
  if (!rowId) return json({ error: "Not found" }, 404);
  const b = await body(req);
  const patch: Record<string, unknown> = {};
  if ("title" in b) {
    const title = str(b.title, 160)?.trim();
    if (!title) return json({ error: "title cannot be empty" }, 400);
    patch.title = title;
  }
  if ("slug" in b) {
    const cleanSlug = slug(b.slug, 160);
    if (cleanSlug) patch.slug = cleanSlug;
  }
  if ("description" in b) patch.description = str(b.description, 600)?.trim() ?? "";
  if ("cover_url" in b) patch.cover_url = str(b.cover_url, 2000)?.trim() || null;
  if ("status" in b) patch.status = b.status === "draft" ? "draft" : "live";
  const hasMembership = "post_ids" in b;
  if (!Object.keys(patch).length && !hasMembership) return json({ error: "no fields" }, 400);
  const { data: before } = await db.from("fn_series").select("slug").eq("id", rowId).maybeSingle();
  if (hasMembership) {
    const ids = Array.isArray(b.post_ids) ? (b.post_ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
    await db.from("fn_series_posts").delete().eq("series_id", rowId);
    if (ids.length) {
      const { error } = await db
        .from("fn_series_posts")
        .insert(ids.map((post_id, i) => ({ series_id: rowId, post_id, position: i })));
      if (error) return json({ error: error.message }, 400);
    }
  }
  let data = null;
  let error = null;
  if (Object.keys(patch).length) {
    ({ data, error } = await db.from("fn_series").update(patch).eq("id", rowId).select().maybeSingle());
    if (error) return json({ error: error.message }, 400);
    if (!data) return json({ error: "Not found" }, 404);
  } else {
    ({ data, error } = await db.from("fn_series").select("*").eq("id", rowId).maybeSingle());
    if (error) return json({ error: error.message }, 400);
    if (!data) return json({ error: "Not found" }, 404);
  }
  if (before?.slug && typeof patch.slug === "string" && patch.slug !== before.slug) {
    await recordRewrite("series", before.slug, patch.slug);
  }
  return json({ series: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const rowId = await resolveId(id);
  if (!rowId) return json({ error: "Not found" }, 404);
  const { error } = await db.from("fn_series").delete().eq("id", rowId);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
