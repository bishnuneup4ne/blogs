type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/* On Vercel the platform sets x-forwarded-for itself and clients cannot
   forge it. Elsewhere (self-hosted, behind an unknown proxy) trust it only
   when explicitly opted in, otherwise every caller could spoof its IP — the
   last hop would then be the only reliable value. */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const trusted = Boolean(process.env.VERCEL) || process.env.TRUST_PROXY === "1";
      // Trusted proxies append the real client; untrusted, take the closest hop.
      return (trusted ? parts[0] : parts[parts.length - 1]).slice(0, 64);
    }
  }
  return (request.headers.get("x-real-ip") ?? "local").slice(0, 64);
}
