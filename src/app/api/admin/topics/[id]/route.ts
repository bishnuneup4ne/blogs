import { adminRoute, body, db, hexColor, integer, json, slug, str } from "@/lib/api-helpers";
import { recordRewrite } from "@/lib/rewrites";
import { PASTELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await body(req);
  const patch: Record<string, unknown> = {};
  if ("name" in b) {
    const name = str(b.name, 120)?.trim();
    if (!name) return json({ error: "name cannot be empty" }, 400);
    patch.name = name;
  }
  if ("slug" in b) {
    const cleanSlug = slug(b.slug, 120);
    if (cleanSlug) patch.slug = cleanSlug;
  }
  if ("description" in b) patch.description = str(b.description, 600)?.trim() ?? "";
  if ("pastel" in b) patch.pastel = (PASTELS as readonly string[]).includes(String(b.pastel)) ? b.pastel : "blue";
  if ("color" in b) patch.color = hexColor(b.color);
  if ("image_url" in b) patch.image_url = str(b.image_url, 2000)?.trim() || null;
  if ("shape" in b && ["circle","squircle","leaf","blob","petal"].includes(String(b.shape))) patch.shape = b.shape;
  if ("sort_order" in b) patch.sort_order = integer(b.sort_order, 0, 10000, 0);
  if (!Object.keys(patch).length) return json({ error: "no fields" }, 400);
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data: before } = await db.from("fn_topics").select("slug").eq(col, id).maybeSingle();
  const { data, error } = await db.from("fn_topics").update(patch).eq(col, id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  if (before?.slug && typeof patch.slug === "string" && patch.slug !== before.slug) {
    await recordRewrite("topic", before.slug, patch.slug);
  }
  return json({ topic: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { error } = await db.from("fn_topics").delete().eq(col, id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
