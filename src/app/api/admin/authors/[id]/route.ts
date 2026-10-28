import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function parseLinks(raw: unknown): { label: string; url: string; icon?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === "object")
    .map((l) => {
      const label = typeof l.label === "string" ? l.label.trim().slice(0, 60) : "";
      const url = typeof l.url === "string" ? l.url.trim().slice(0, 500) : "";
      const icon = typeof l.icon === "string" ? l.icon.trim().slice(0, 40) : undefined;
      if (!label || !url) return null;
      if (!/^(https?:\/\/|mailto:)/i.test(url)) return null;
      return icon ? { label, url, icon } : { label, url };
    })
    .filter((l): l is { label: string; url: string; icon?: string } => l !== null)
    .slice(0, 12);
}

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const input = await body(req);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof input.name === "string" && input.name.trim()) patch.name = input.name.trim().slice(0, 120);
  if (typeof input.role === "string") patch.role = input.role.trim().slice(0, 140);
  if (typeof input.bio === "string") patch.bio = input.bio.trim().slice(0, 2000);
  if (typeof input.email === "string") patch.email = input.email.trim().slice(0, 200);
  if (typeof input.avatar_url === "string") patch.avatar_url = input.avatar_url.trim().slice(0, 600);
  if (input.status === "active" || input.status === "inactive") patch.status = input.status;
  if (Number.isFinite(Number(input.sort_order))) patch.sort_order = Number(input.sort_order);
  if (Array.isArray(input.social_links)) patch.social_links = parseLinks(input.social_links);

  if (Object.keys(patch).length === 1) return json({ error: "no fields" }, 400);

  let { data, error } = await db.from("fn_authors").update(patch).eq("id", id).select().maybeSingle();
  if (error && /social_links|bio|status|updated_at/.test(error.message)) {
    // fn_authors has no updated_at, and older schemas lack the newer columns.
    delete patch.updated_at;
    delete patch.social_links;
    delete patch.status;
    delete patch.bio;
    ({ data, error } = await db.from("fn_authors").update(patch).eq("id", id).select().maybeSingle());
  }
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