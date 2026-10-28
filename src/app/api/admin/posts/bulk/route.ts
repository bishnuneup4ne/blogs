import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const ACTIONS = ["publish", "draft", "feature", "unfeature", "delete", "duplicate"] as const;
type Action = (typeof ACTIONS)[number];

const ID = /^[0-9a-f-]{36}$/i;
const MAX_BATCH = 100;

/** One round-trip for every multi-row action the posts table offers. */
export const POST = adminRoute(async (req) => {
  const input = await body(req);
  const action = input.action as Action;
  if (!ACTIONS.includes(action)) return json({ error: "Unknown action" }, 400);
  if (!Array.isArray(input.ids)) return json({ error: "ids must be an array" }, 400);
  const ids = [...new Set(input.ids.filter((id): id is string => typeof id === "string" && ID.test(id)))];
  if (ids.length === 0) return json({ error: "No valid post ids" }, 400);
  if (ids.length > MAX_BATCH) return json({ error: `At most ${MAX_BATCH} posts at a time` }, 400);

  if (action === "publish" || action === "draft") {
    const patch = {
      status: action === "publish" ? "published" : "draft",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db.from("fn_posts").update(patch).in("id", ids).select("id");
    if (error) return json({ error: error.message }, 400);
    return json({ updated: data?.length ?? 0 });
  }

  if (action === "feature") {
    // Only one post can lead the home rail, so featuring replaces the previous one.
    if (ids.length !== 1) return json({ error: "Feature one post at a time" }, 400);
    const { error: clearError } = await db.from("fn_posts").update({ featured: false }).eq("featured", true).neq("id", ids[0]);
    if (clearError) return json({ error: clearError.message }, 400);
    const { error } = await db.from("fn_posts").update({ featured: true }).eq("id", ids[0]);
    if (error) return json({ error: error.message }, 400);
    return json({ updated: 1 });
  }

  if (action === "unfeature") {
    const { data, error } = await db.from("fn_posts").update({ featured: false }).in("id", ids).select("id");
    if (error) return json({ error: error.message }, 400);
    return json({ updated: data?.length ?? 0 });
  }

  if (action === "delete") {
    const { data, error } = await db.from("fn_posts").delete().in("id", ids).select("*");
    if (error) return json({ error: error.message }, 400);
    // Comments/reactions key off slug with no FK — clear them or they orphan.
    const slugs = (data ?? []).map((p) => p.slug).filter(Boolean);
    if (slugs.length) {
      await Promise.all([
        db.from("fn_comments").delete().in("post_slug", slugs),
        db.from("fn_reactions").delete().in("post_slug", slugs),
      ]);
    }
    return json({ deleted: data?.length ?? 0, posts: data ?? [] });
  }

  // Duplicate: read the originals once, then insert copies so a failure never
  // leaves half-written rows pointing at the right ids.
  const { data: originals, error: readError } = await db.from("fn_posts").select("*").in("id", ids);
  if (readError) return json({ error: readError.message }, 400);
  if (!originals?.length) return json({ error: "Nothing to duplicate" }, 404);

  const stamp = Date.now().toString(36);
  const copies = originals.map((row: Record<string, unknown>, index: number) => {
    const copy: Record<string, unknown> = { ...row };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.views_total;
    copy.title = `${String(row.title)} (copy)`;
    copy.slug = `${String(row.slug)}-copy-${stamp}${index ? `-${index}` : ""}`;
    copy.status = "draft";
    copy.featured = false;
    return copy;
  });
  const { data: created, error } = await db.from("fn_posts").insert(copies).select("id, title, slug");
  if (error) return json({ error: error.message }, 400);
  return json({ duplicated: created?.length ?? 0, posts: created ?? [] }, 201);
});
