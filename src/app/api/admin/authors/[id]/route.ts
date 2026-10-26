import { adminRoute, body, db, email, image, integer, json, str } from "@/lib/api-helpers";

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
  if ("role" in b) patch.role = str(b.role, 120)?.trim() ?? "";
  if ("email" in b) {
    const emailAddress = email(b.email);
    if (emailAddress === null) return json({ error: "invalid email address" }, 400);
    patch.email = emailAddress;
  }
  if ("avatar_url" in b) patch.avatar_url = image(b.avatar_url, "/images/avatar.svg");
  if ("short_bio" in b) patch.short_bio = str(b.short_bio, 400)?.trim() ?? "";
  if ("bio" in b) patch.bio = str(b.bio, 4000)?.trim() ?? "";
  if ("sort_order" in b) patch.sort_order = integer(b.sort_order, 0, 10000, 0);
  if (!Object.keys(patch).length) return json({ error: "no fields" }, 400);
  const { data, error } = await db.from("fn_authors").update(patch).eq("id", id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ author: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { error } = await db.from("fn_authors").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
