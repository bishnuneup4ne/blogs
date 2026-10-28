import { adminRoute, body, db, json, str } from "@/lib/api-helpers";
import { revalidateContentCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const postSlug = str(b.post_slug, 200)?.trim();
  const name = str(b.name, 80)?.trim();
  const text = str(b.body, 4000)?.trim();
  if (!postSlug || !name || !text) return json({ error: "post_slug, name and body are required" }, 400);
  const status = ["pending", "approved", "spam"].includes(String(b.status)) ? b.status : "pending";
  // Preserve reply threading on undo: only accept a UUID-shaped parent.
  const parentId =
    typeof b.parent_id === "string" && /^[0-9a-f-]{36}$/i.test(b.parent_id) ? b.parent_id : null;
  const { data, error } = await db.from("fn_comments").insert({
    post_slug: postSlug,
    name,
    email: str(b.email, 200) ?? "",
    body: text,
    parent_id: parentId,
    status,
  }).select().single();
  if (error) return json({ error: error.message }, 400);
  await revalidateContentCache();
  return json({ comment: data }, 201);
});

export const GET = adminRoute(async () => {
  const { data, error } = await db
    .from("fn_comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ comments: data });
});
