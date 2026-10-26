import { adminRoute, body, dateOnly, db, image, integer, json, str } from "@/lib/api-helpers";
import { detectExternalVideo } from "@/lib/external-video";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async (req) => {
  const album = req.nextUrl.searchParams.get("album");
  let query = db.from("fn_photos").select("*").order("position");
  if (album) query = query.eq("album_id", album);
  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ photos: data });
});

const POST_FIELDS = [
  "album_id", "src", "alt", "caption", "width", "height",
  "taken_at", "camera", "kind", "poster_url", "position", "cover_too",
];

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const missing = POST_FIELDS.filter((f) => !(f in b));
  const album_id = str(b.album_id, 40)?.trim();
  if (!album_id) return json({ error: "album_id is required" }, 400);

  // External links (YouTube/Vimeo) are stored as the canonical watch URL.
  let kind = b.kind === "video" ? "video" : "image";
  let src = "";
  let poster = "";
  const link = typeof b.url === "string" ? b.url.trim() : "";
  const external = link ? detectExternalVideo(link) : null;
  if (link && !external) {
    return json({ error: "That does not look like a YouTube or Vimeo link." }, 400);
  }
  if (external) {
    kind = "video";
    src = external.url;
    poster = image(b.poster_url) || external.thumbnail;
  } else {
    src = image(b.src);
    poster = image(b.poster_url);
    if (!src) return json({ error: "A valid image/video URL is required" }, 400);
  }
  void missing;

  const { count } = await db.from("fn_photos").select("id", { count: "exact", head: true }).eq("album_id", album_id);
  const caption = str(b.caption, 400)?.trim() ?? "";
  const payload = {
    album_id,
    src,
    alt: str(b.alt, 400)?.trim() || caption,
    caption,
    width: integer(b.width, 1, 20000, 1400),
    height: integer(b.height, 1, 20000, 933),
    taken_at: dateOnly(b.taken_at),
    camera: str(b.camera, 120)?.trim() ?? "",
    kind,
    poster_url: poster,
    position: integer(b.position, 0, 10000, count ?? 0),
  };
  const { data, error } = await db.from("fn_photos").insert(payload).select().single();
  if (error) return json({ error: error.message }, 400);
  if (!b.cover_too && payload.kind === "image") {
    const { data: album } = await db.from("fn_albums").select("cover_url").eq("id", album_id).maybeSingle();
    if (album && !album.cover_url) await db.from("fn_albums").update({ cover_url: src }).eq("id", album_id);
  }
  return json({ photo: data }, 201);
});
