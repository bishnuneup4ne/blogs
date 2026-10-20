/**
 * Column allow-lists for admin writes.
 *
 * These routes used to spread the request body straight into Supabase
 * (`.insert({...body})` / `.update(body)`), which let a crafted request set
 * server-managed columns such as `is_deleted`, `id`, or `created_at`, and would
 * error out on any unknown key. Picking only known columns also means a client
 * cannot write to a column that is added to the table later.
 */

/** Returns only the keys of `input` that are in `allowed`, dropping the rest. */
export function pick<T extends Record<string, unknown>>(
  input: unknown,
  allowed: readonly (keyof T | string)[],
): Record<string, unknown> {
  if (typeof input !== "object" || input === null) return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key as string] = source[key as string];
    }
  }
  return out;
}

export const WRITEUP_COLUMNS = [
  "title",
  "slug",
  "category",
  "summary",
  "content",
  "featured_image_url",
  "image_url",
  "images",
  "tags",
  "video_url",
  "status",
  "date",
] as const;

export const PROJECT_COLUMNS = [
  "title",
  "slug",
  "summary",
  "content",
  "featured_image_url",
  "images",
  "technologies",
  "live_url",
  "github_url",
  "status",
  "date",
] as const;
