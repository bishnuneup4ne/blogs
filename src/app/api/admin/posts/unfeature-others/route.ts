import { adminRoute, body, db, json, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Keep exactly one featured post: clear the flag on every other row. */
export const POST = adminRoute(async (req) => {
  const keep = str((await body(req)).id, 64);
  if (!keep) return json({ error: "id is required" }, 400);
  const { error } = await db.from("fn_posts").update({ featured: false }).neq("id", keep).eq("featured", true);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
