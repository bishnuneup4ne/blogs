import { revalidateTag } from "next/cache";

/** Seconds to cache Supabase reads (dev + prod). Lower = fresher, higher = faster. */
export const DATA_REVALIDATE_SECONDS = 60;

interface RevalidateContentOptions {
  writeupSlug?: string;
  projectSlug?: string;
}

/**
 * Purge the unstable_cache entries that admin writes can invalidate.
 * `writeups`/`projects` list caches and `nav-categories` (derived from writeups)
 * are always dropped; the per-slug caches only when we know the slug.
 */
export function revalidateContentCache(options: RevalidateContentOptions = {}): void {
  const tags = ["writeups", "projects", "nav-categories"];
  if (options.writeupSlug) tags.push(`writeup-${options.writeupSlug}`);
  if (options.projectSlug) tags.push(`project-${options.projectSlug}`);

  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.warn(`[cache] failed to revalidate tag "${tag}":`, error);
    }
  }
}
