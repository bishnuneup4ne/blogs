import { adminRoute, body, db, image, integer, json, slug, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const [{ data: albums, error }, { data: photos }] = await Promise.all([
    db.from("fn_albums").select("*").order("sort_order", { ascending: false }),
    db.from("fn_photos").select("album_id,kind"),
  ]);
  if (error) return json({ error: error.message }, 500);
  const counts = new Map<string, number>();
  const videos = new Map<string, number>();
  for (const p of photos ?? []) {
    counts.set(p.album_id, (counts.get(p.album_id) ?? 0) + 1);
    if (p.kind === "video") videos.set(p.album_id, (videos.get(p.album_id) ?? 0) + 1);
  }
  // Pick the first photo of each album as a live cover preview.
  const { data: first } = await db.from("fn_photos").select("album_id,src,kind").order("position");
  const coverOf = new Map<string, string>();
  for (const p of first ?? []) if (!coverOf.has(p.album_id) && p.kind !== "video") coverOf.set(p.album_id, p.src);
  return json({
    albums: (albums ?? []).map((a: any) => ({
      ...a,
      photo_count: counts.get(a.id) ?? 0,
      video_count: videos.get(a.id) ?? 0,
      first_photo: coverOf.get(a.id) ?? "",
    })),
  });
});

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const title = str(b.title, 200)?.trim();
  if (!title) return json({ error: "title is required" }, 400);
  const payload = {
    title,
    slug: slug(b.slug, 200) || slug(title, 200) || `album-${Date.now()}`,
    subtitle: str(b.subtitle, 300)?.trim() ?? "",
    description: str(b.description, 2000)?.trim() ?? "",
    year: integer(b.year, 1900, 2100, new Date().getFullYear()),
    cover_url: image(b.cover_url),
    sort_order: integer(b.sort_order, 0, 10000, 0),
  };
  const { data, error } = await db.from("fn_albums").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ album: data }, 201);
});
