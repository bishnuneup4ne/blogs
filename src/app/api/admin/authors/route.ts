import { adminRoute, body, db, email, image, integer, json, slug, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const { data, error } = await db.from("fn_authors").select("*").order("sort_order");
  if (error) return json({ error: error.message }, 500);
  return json({ authors: data });
});

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const name = str(b.name, 120)?.trim();
  if (!name) return json({ error: "name is required" }, 400);
  const id = str(b.id, 100)?.trim() || slug(name, 100);
  if (!id || !/^[a-z0-9-]+$/.test(id)) return json({ error: "id may only contain lowercase letters, numbers and hyphens" }, 400);
  const emailAddress = email(b.email);
  if (emailAddress === null) return json({ error: "invalid email address" }, 400);
  const payload = {
    id,
    name,
    role: str(b.role, 120)?.trim() ?? "",
    email: emailAddress,
    avatar_url: image(b.avatar_url, "/images/avatar.svg"),
    short_bio: str(b.short_bio, 400)?.trim() ?? "",
    bio: str(b.bio, 4000)?.trim() ?? "",
    sort_order: integer(b.sort_order, 0, 10000, 0),
  };
  const { data, error } = await db.from("fn_authors").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ author: data }, 201);
});
