import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Accepts [{ label, url, icon }] and drops anything malformed. */
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

export const GET = adminRoute(async () => {
  const { data, error } = await db.from("fn_authors").select("*").order("sort_order").order("name");
  if (error) return json({ error: error.message }, 500);
  return json({ authors: data ?? [] });
});

export const POST = adminRoute(async (req) => {
  const input = await body(req);
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!name) return json({ error: "Name is required" }, 400);

  const slugId = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const payload = {
    // fn_authors.id is text with no default; derive a readable, unique id.
    id: `${slugId || "author"}-${Date.now().toString(36).slice(-4)}`,
    name,
    role: typeof input.role === "string" ? input.role.trim().slice(0, 140) : "",
    bio: typeof input.bio === "string" ? input.bio.trim().slice(0, 2000) : "",
    // Both columns are NOT NULL in the schema — send "" rather than null.
    email: typeof input.email === "string" ? input.email.trim().slice(0, 200) : "",
    avatar_url: typeof input.avatar_url === "string" ? input.avatar_url.trim().slice(0, 600) : "",
    status: input.status === "inactive" ? "inactive" : "active",
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
    social_links: parseLinks(input.social_links),
  };

  let { data, error } = await db.from("fn_authors").insert(payload).select().single();
  // Older schemas lack social_links/bio — drop the unknown column and retry.
  if (error && /social_links|bio|status/.test(error.message)) {
    delete (payload as Record<string, unknown>).social_links;
    delete (payload as Record<string, unknown>).bio;
    delete (payload as Record<string, unknown>).status;
    ({ data, error } = await db.from("fn_authors").insert(payload).select().single());
  }
  if (error) return json({ error: error.message }, 400);
  return json({ author: data }, 201);
});