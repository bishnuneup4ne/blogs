import { adminRoute, body, db, hexColor, integer, json, slug, str } from "@/lib/api-helpers";
import { PASTELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const { data, error } = await db.from("fn_topics").select("*").order("sort_order");
  if (error) return json({ error: error.message }, 500);
  return json({ topics: data });
});

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const name = str(b.name, 120)?.trim();
  if (!name) return json({ error: "name is required" }, 400);
  const topicSlug = slug(b.slug, 120) || slug(name, 120) || `topic-${Date.now()}`;
  const { count } = await db.from("fn_topics").select("id", { count: "exact", head: true }).eq("slug", topicSlug);
  const payload = {
    name,
    slug: topicSlug,
    description: str(b.description, 600)?.trim() ?? "",
    pastel: (PASTELS as readonly string[]).includes(String(b.pastel)) ? b.pastel : "blue",
    color: hexColor(b.color),
    image_url: str(b.image_url, 2000)?.trim() || null,
    // "circle" is the default even before the shape column exists in the DB.
    ...(b.shape !== undefined ? { shape: ["circle","squircle","leaf","blob","petal"].includes(String(b.shape)) ? b.shape : "circle" } : {}),
    sort_order: integer(b.sort_order, 0, 10000, (count ?? 0) + 1),
  };
  const { data, error } = await db.from("fn_topics").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ topic: data }, 201);
});
