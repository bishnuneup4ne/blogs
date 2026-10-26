import { adminRoute, body, db, json, str } from "@/lib/api-helpers";
import { parsePostInput } from "@/lib/post-input";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data, error } = await db.from("fn_posts").select("*").eq(col, id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ post: data });
});

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const parsed = parsePostInput(await body(req), { partial: true });
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const patch: Record<string, unknown> = { ...parsed.data };
  if (Object.keys(patch).length === 0) return json({ error: "no fields" }, 400);
  patch.updated_at = new Date().toISOString();
  let { data, error } = await db.from("fn_posts").update(patch).eq(col, id).select().maybeSingle();
  // Older schemas lack cover_height — drop it and retry instead of failing the save.
  if (error && /cover_height/.test(error.message) && "cover_height" in patch) {
    delete patch.cover_height;
    ({ data, error } = await db.from("fn_posts").update(patch).eq(col, id).select().maybeSingle());
  }
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ post: data });
});

export const DELETE = adminRoute(async (req, ctx) => {
  // Soft delete: move to draft with a trashed flag rather than destroying content.
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    const { error } = await db.from("fn_posts").delete().eq(col, id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }
  const { data, error } = await db.from("fn_posts").update({ status: "draft", slug: `${str(id, 200)}-deleted-${Date.now()}` }).eq(col, id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ ok: true });
});
