import { adminRoute, body, dateOnly, db, image, integer, json, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await body(req);
  const patch: Record<string, unknown> = {};
  if ("src" in b) {
    const src = image(b.src);
    if (!src) return json({ error: "src must be a valid image/video URL" }, 400);
    patch.src = src;
  }
  if ("alt" in b) patch.alt = str(b.alt, 400)?.trim() ?? "";
  if ("caption" in b) patch.caption = str(b.caption, 400)?.trim() ?? "";
  if ("width" in b) patch.width = integer(b.width, 1, 20000, 1400);
  if ("height" in b) patch.height = integer(b.height, 1, 20000, 933);
  if ("taken_at" in b) patch.taken_at = dateOnly(b.taken_at);
  if ("camera" in b) patch.camera = str(b.camera, 120)?.trim() ?? "";
  if ("position" in b) patch.position = integer(b.position, 0, 10000, 0);
  if (!Object.keys(patch).length) return json({ error: "no fields" }, 400);
  const { data, error } = await db.from("fn_photos").update(patch).eq("id", id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ photo: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { error } = await db.from("fn_photos").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
