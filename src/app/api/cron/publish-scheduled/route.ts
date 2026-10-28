import { revalidateContentCache } from "@/lib/data";
import { db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Publishes due scheduled posts. Wired up with a Vercel cron (vercel.json):
 *
 *   { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "5 0 * * *" }] }
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` automatically; manual
 * calls must set the same header when CRON_SECRET is defined.
 * Env: add CRON_SECRET (any random string) to Production + Development.
 */
const today = () => new Date().toISOString().slice(0, 10);

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);
  }

  const { data: due, error: readError } = await db
    .from("fn_posts")
    .select("id, slug, title, date")
    .eq("status", "scheduled")
    .lte("date", today());
  if (readError) return json({ error: readError.message }, 500);

  const ids = (due ?? []).map((row) => row.id);
  if (ids.length === 0) return json({ published: 0 });

  const { error } = await db
    .from("fn_posts")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return json({ error: error.message }, 500);

  await revalidateContentCache();
  return json({ published: ids.length, slugs: ids.map((id) => due.find((r) => r.id === id)?.slug) });
}
