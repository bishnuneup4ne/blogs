import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/* Keep the newest 30 revisions per post; snapshots are heavy (full blocks). */
const KEEP = 30;

export const GET = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";

  // The URL may carry an id or a slug; fn_post_revisions references post id.
  const { data: post, error: postError } = await db.from("fn_posts").select("id").eq(col, id).maybeSingle();
  if (postError) return json({ error: postError.message }, 500);
  if (!post) return json({ error: "Not found" }, 404);

  const { data, error } = await db
    .from("fn_post_revisions")
    .select("id, title, status, snapshot, created_at")
    .eq("post_id", post.id)
    .order("created_at", { ascending: false })
    .limit(KEEP);
  if (error) {
    // The table is new — an older database just hasn't had schema.sql run.
    if (/Could not find the table|schema cache|PGRST205|42P01/i.test(error.message)) {
      return json({ revisions: [], needsSetup: true }, 200);
    }
    return json({ error: error.message }, 500);
  }
  return json({ revisions: data ?? [] });
});

/* Restoring a revision is a normal PATCH of the post with the stored fields,
   which (via the PATCH route) also snapshots the current state first — so a
   restore can itself be undone. */
export const POST = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const col = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { revisionId } = await body(req);
  if (typeof revisionId !== "string" || !/^[0-9a-f-]{36}$/i.test(revisionId)) {
    return json({ error: "revisionId is required" }, 400);
  }

  const { data: post, error: postError } = await db.from("fn_posts").select("id").eq(col, id).maybeSingle();
  if (postError) return json({ error: postError.message }, 500);
  if (!post) return json({ error: "Not found" }, 404);

  const { data: revision, error: revError } = await db
    .from("fn_post_revisions")
    .select("snapshot")
    .eq("id", revisionId)
    .eq("post_id", post.id)
    .maybeSingle();
  if (revError) return json({ error: revError.message }, 500);
  if (!revision) return json({ error: "Revision not found" }, 404);

  const snap = (revision.snapshot ?? {}) as Record<string, unknown>;
  // Only content fields — never copy the slug or the featured flag forward,
  // so restoring an old snapshot doesn't break redirects or homepage layout.
  const patch: Record<string, unknown> = {
    summary: snap.summary ?? "",
    status: snap.status ?? "draft",
    topic_slug: snap.topic_slug ?? null,
    tags: snap.tags ?? [],
    cover_url: snap.cover_url ?? null,
    cover_alt: snap.cover_alt ?? "",
    cover_height: snap.cover_height ?? null,
    cover_focal: snap.cover_focal ?? 30,
    date: snap.date ?? undefined,
    reading_minutes: snap.reading_minutes ?? 1,
    blocks: snap.blocks ?? [],
  };
  if (typeof snap.title === "string" && snap.title) patch.title = snap.title;

  const { data, error } = await db.from("fn_posts").update(patch).eq(col, id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ post: data });
});
