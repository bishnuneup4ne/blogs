import { adminRoute, body, db, json, str } from "@/lib/api-helpers";
import { parsePostInput } from "@/lib/post-input";
import { recordRewrite } from "@/lib/rewrites";

export const dynamic = "force-dynamic";

/* Keep only the newest 30 revisions for a post; called after each snapshot. */
async function pruneRevisions(postId: string) {
  const { data: rows } = await db
    .from("fn_post_revisions")
    .select("id")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .range(30, 30 + 50); // one page past the keep window is enough
  for (const row of rows ?? []) {
    await db.from("fn_post_revisions").delete().eq("id", row.id);
  }
}

export const GET = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data, error } = await db.from("fn_posts").select("*").eq(col, id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  // The public URL only exists once the row is published.
  let live = false;
  if (data.status === "published") {
    const { data: hit } = await db.from("fn_posts").select("id").eq("slug", data.slug).eq("status", "published").maybeSingle();
    live = Boolean(hit);
  }
  return json({ post: data, live });
});

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const parsed = parsePostInput(await body(req), { partial: true });
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const patch: Record<string, unknown> = { ...parsed.data };
  if (Object.keys(patch).length === 0) return json({ error: "no fields" }, 400);
  patch.updated_at = new Date().toISOString();
  const { data: before } = await db.from("fn_posts").select("*").eq(col, id).maybeSingle();
  if (before) {
    // Snapshot the pre-save state so the editor's revision history can undo it.
    const { error: revError } = await db.from("fn_post_revisions").insert({
      post_id: before.id,
      title: before.title ?? "",
      status: before.status ?? "draft",
      snapshot: before,
    });
    if (!revError) await pruneRevisions(before.id);
  }
  let { data, error } = await db.from("fn_posts").update(patch).eq(col, id).select().maybeSingle();
  // Older schemas lack cover_height — drop it and retry instead of failing the save.
  if (error && /cover_height|cover_focal/.test(error.message)) {
    delete patch.cover_height;
    delete patch.cover_focal;
    ({ data, error } = await db.from("fn_posts").update(patch).eq(col, id).select().maybeSingle());
  }
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  // Slug changed? Log the old URL for 301s and repoint every link to it.
  if (before?.slug && typeof patch.slug === "string" && patch.slug !== before.slug) {
    await recordRewrite("post", before.slug, patch.slug);
  }
  return json({ post: data });
});

export const DELETE = adminRoute(async (req, ctx) => {
  // Soft delete: move to draft with a trashed flag rather than destroying content.
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    // Resolve the row first: revisions/views key off post id, comments/reactions off slug.
    const { data: existing } = await db.from("fn_posts").select("id, slug").eq(col, id).maybeSingle();
    if (!existing) return json({ error: "Not found" }, 404);
    const { error } = await db.from("fn_posts").delete().eq("id", existing.id);
    if (error) return json({ error: error.message }, 400);
    // fn_post_revisions/fn_post_views cascade via FK; comments/reactions are
    // keyed by slug with no FK, so clear them explicitly or they orphan forever.
    await Promise.all([
      db.from("fn_comments").delete().eq("post_slug", existing.slug),
      db.from("fn_reactions").delete().eq("post_slug", existing.slug),
    ]);
    return json({ ok: true });
  }
  const { data: existing } = await db.from("fn_posts").select("slug").eq(col, id).maybeSingle();
  if (!existing) return json({ error: "Not found" }, 404);
  // Slug column is capped at 160 by the API helper; reserve room for the suffix.
  const base = str(existing.slug, 140) ?? "post";
  const newSlug = `${base}-deleted-${Date.now()}`;
  const { data, error } = await db.from("fn_posts").update({ status: "draft", slug: newSlug }).eq(col, id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ ok: true });
});
