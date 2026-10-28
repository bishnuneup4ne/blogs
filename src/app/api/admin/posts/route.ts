import { adminRoute, body, db, json } from "@/lib/api-helpers";
import { parsePostInput } from "@/lib/post-input";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async (req) => {
  const status = req.nextUrl.searchParams.get("status");
  let query = db.from("fn_posts").select("*").order("date", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ posts: data });
});

export const POST = adminRoute(async (req) => {
  const parsed = parsePostInput(await body(req), { partial: false });
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const payload = {
    summary: "",
    status: "draft",
    topic_slug: null,
    author_id: null,
    tags: [],
    cover_url: null,
    cover_alt: "",
    date: new Date().toISOString().slice(0, 10),
    reading_minutes: 1,
    blocks: [],
    featured: false,
    ...parsed.data,
  };
  let { data, error } = await db.from("fn_posts").insert(payload).select().single();
  // Older schemas lack cover_height — drop it and retry instead of failing the save.
  if (error && /cover_height|cover_focal/.test(error.message)) {
    delete payload.cover_height;
    delete payload.cover_focal;
    ({ data, error } = await db.from("fn_posts").insert(payload).select().single());
  }
  // On a slug clash, retry once with a unique suffix so "New post" never fails.
  if (error && /duplicate key value violates unique constraint "fn_posts_slug_key"/i.test(error.message)) {
    payload.slug = `${payload.slug}-${Date.now().toString(36)}`;
    ({ data, error } = await db.from("fn_posts").insert(payload).select().single());
  }
  if (error) return json({ error: error.message }, 400);
  return json({ post: data }, 201);
});
