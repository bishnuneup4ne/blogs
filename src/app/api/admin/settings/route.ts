import { adminRoute, body, db, json } from "@/lib/api-helpers";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  return json({ payload: await getSettings() });
});

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function clean(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value === "string" ? value.slice(0, 10_000) : value;
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => clean(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) continue;
      out[key.slice(0, 100)] = clean(item, depth + 1);
    }
    return out;
  }
  return null;
}

export const PUT = adminRoute(async (req) => {
  const b = await body(req);
  if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "payload object required" }, 400);
  if (JSON.stringify(b).length > 200_000) return json({ error: "Settings payload is too large" }, 413);
  const { data: current } = await db.from("fn_settings").select("payload").eq("id", 1).maybeSingle();
  const payload = clean({
    ...((current?.payload as Record<string, unknown> | undefined) ?? {}),
    ...b,
  }) as Record<string, unknown>;
  const { error } = await db
    .from("fn_settings")
    .upsert({ id: 1, payload, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
