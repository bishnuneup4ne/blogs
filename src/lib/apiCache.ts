// Tiny in-memory TTL cache for admin GET endpoints.
// Supabase round-trips from this region are slow (1–20s); caching identical
// reads for a short window makes the admin panel feel instant.

type Entry = { at: number; data: unknown };

const store = new Map<string, Entry>();

export type CachedResult<T> = { data: T | null; error: { message: string } | null };

export async function cachedQuery<T>(
  key: string,
  ttlMs: number,
  run: () => PromiseLike<CachedResult<T>>,
): Promise<CachedResult<T>> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return { data: hit.data as T, error: null };
  }
  const res = await Promise.resolve(run());
  if (!res.error && res.data !== null) {
    store.set(key, { at: Date.now(), data: res.data });
  }
  return res;
}

export function invalidateCache(prefix?: string) {
  for (const k of store.keys()) {
    if (!prefix || k.startsWith(prefix)) store.delete(k);
  }
}
