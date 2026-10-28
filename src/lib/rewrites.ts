import "server-only";

import { db } from "@/lib/supabase/server";
import { revalidateContentCache } from "@/lib/data";

/* ------------------------------------------------------------------ */
/* Slug renames: old -> new rewrites, stored in fn_rewrites.           */
/*                                                                     */
/* 1. recordRewrite() logs the rename and rewrites /blog/<old> links   */
/*    inside every post body (rich-text hrefs + related-block slugs),  */
/*    so nothing in the site keeps pointing at the dead URL.           */
/* 2. resolveRewrite() lets the proxy 301 any old URL still live in    */
/*    someone's bookmarks, Google index or an external link.           */
/* ------------------------------------------------------------------ */

export type RewriteKind = "post" | "topic" | "series";

const PREFIX: Record<RewriteKind, string> = {
  post: "/blog/",
  topic: "/blog/category/",
  series: "/series/",
};

export async function recordRewrite(kind: RewriteKind, oldSlug: string, newSlug: string): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  try {
    await db
      .from("fn_rewrites")
      .insert({ kind, from_path: `${PREFIX[kind]}${oldSlug}`, to_path: `${PREFIX[kind]}${newSlug}` });
  } catch {
    // Table not created yet — redirects are a bonus, never fail the save.
    return;
  }
  clearRewriteCache();
  if (kind === "post") await rewritePostLinks(oldSlug, newSlug);
  else await rewriteTopicOrSeriesLinks(kind, oldSlug, newSlug);
  await revalidateContentCache();
}

async function rewritePostLinks(oldSlug: string, newSlug: string): Promise<void> {
  const { data: rows, error } = await db.from("fn_posts").select("id, blocks").not("blocks", "is", null);
  if (error || !rows?.length) return;
  // Covers plain hrefs, JSON-encoded hrefs inside block payloads, and
  // related-block slug fields — one pattern handles all three.
  const pattern = new RegExp(`\\b${escapeRegex(oldSlug)}\\b`, "g");
  for (const row of rows) {
    const original = JSON.stringify(row.blocks ?? []);
    const updated = original.replace(pattern, newSlug);
    if (updated !== original) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(updated);
      } catch {
        continue;
      }
      await db.from("fn_posts").update({ blocks: parsed }).eq("id", row.id);
    }
  }
}

async function rewriteTopicOrSeriesLinks(kind: RewriteKind, oldSlug: string, newSlug: string): Promise<void> {
  const pathOld = `${PREFIX[kind]}${oldSlug}`;
  const pathNew = `${PREFIX[kind]}${newSlug}`;
  const { data: rows, error } = await db.from("fn_posts").select("id, blocks").not("blocks", "is", null);
  if (error || !rows?.length) return;
  for (const row of rows) {
    const original = JSON.stringify(row.blocks ?? []);
    const updated = original.split(encodeURIComponent(pathOld)).join(encodeURIComponent(pathNew));
    if (updated === original) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(updated);
    } catch {
      continue;
    }
    await db.from("fn_posts").update({ blocks: parsed }).eq("id", row.id);
  }
}

/* Chain-following lookup used by the proxy: /blog/old → /blog/new (→ …).

   Runs on every /blog/* and /series/* request, so the whole table is read
   once and cached briefly: one query per TTL instead of a round-trip per page
   view, and a missing table costs one failed query rather than every hit. */

let cache: { at: number; map: Map<string, string> } | null = null;
const TTL = 60_000;

async function rewriteMap(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const { data, error } = await db
    .from("fn_rewrites")
    .select("from_path, to_path, created_at")
    .order("created_at", { ascending: false });
  const map = new Map<string, string>();
  if (!error) {
    // Newest first, so the first row seen for a path is the current target.
    for (const row of data ?? []) {
      if (row.from_path && !map.has(row.from_path)) map.set(row.from_path, row.to_path);
    }
  }
  cache = { at: Date.now(), map };
  return map;
}

/** Drop the cache after a rename so the next request sees the new row. */
export function clearRewriteCache() {
  cache = null;
}

export async function resolveRewrite(path: string): Promise<string | null> {
  const map = await rewriteMap();
  if (map.size === 0) return null;
  let current = path;
  for (let hops = 0; hops < 5; hops++) {
    const next = map.get(current) ?? null;
    if (!next) break;
    current = next;
  }
  return current === path ? null : current;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
