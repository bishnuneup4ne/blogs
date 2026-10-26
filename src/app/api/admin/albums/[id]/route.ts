import { adminRoute, body, db, image, integer, json, slug, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await body(req);
  const patch: Record<string, unknown> = {};
  if ("title" in b) {
    const title = str(b.title, 200)?.trim();
    if (!title) return json({ error: "title cannot be empty" }, 400);
    patch.title = title;
  }
  if ("slug" in b) {
    const cleanSlug = slug(b.slug, 200);
    if (!cleanSlug) return json({ error: "slug cannot be empty" }, 400);
    patch.slug = cleanSlug;
  }
  if ("subtitle" in b) patch.subtitle = str(b.subtitle, 300)?.trim() ?? "";
  if ("description" in b) patch.description = str(b.description, 2000)?.trim() ?? "";
  if ("year" in b) patch.year = integer(b.year, 1900, 2100, new Date().getFullYear());
  if ("cover_url" in b) patch.cover_url = image(b.cover_url);
  if ("sort_order" in b) patch.sort_order = integer(b.sort_order, 0, 10000, 0);
  if (!Object.keys(patch).length) return json({ error: "no fields" }, 400);
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data, error } = await db.from("fn_albums").update(patch).eq(col, id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ album: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { error } = await db.from("fn_albums").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
