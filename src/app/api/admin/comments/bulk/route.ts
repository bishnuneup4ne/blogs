import { revalidatePath } from "next/cache";
import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const ACTIONS = ["approve", "pending", "spam", "delete"] as const;
type Action = (typeof ACTIONS)[number];
const STATUS: Record<string, string> = { approve: "approved", pending: "pending", spam: "spam" };
const ID = /^[0-9a-f-]{36}$/i;
const MAX_BATCH = 200;

/** Multi-row moderation for the comments table. */
export const POST = adminRoute(async (req) => {
  const input = await body(req);
  const action = input.action as Action;
  if (!ACTIONS.includes(action)) return json({ error: "Unknown action" }, 400);
  if (!Array.isArray(input.ids)) return json({ error: "ids must be an array" }, 400);
  const ids = [...new Set(input.ids.filter((id): id is string => typeof id === "string" && ID.test(id)))];
  if (!ids.length) return json({ error: "No valid comment ids" }, 400);
  if (ids.length > MAX_BATCH) return json({ error: `At most ${MAX_BATCH} comments at a time` }, 400);

  if (action === "delete") {
    // Removed rows come back to the client so the toast can offer Undo.
    const { data, error } = await db.from("fn_comments").delete().in("id", ids).select("*");
    if (error) return json({ error: error.message }, 400);
    revalidatePath("/blog/[slug]", "page");
    return json({ deleted: data?.length ?? 0, comments: data ?? [] });
  }

  const { data, error } = await db.from("fn_comments").update({ status: STATUS[action] }).in("id", ids).select("id");
  if (error) return json({ error: error.message }, 400);
  revalidatePath("/blog/[slug]", "page");
  return json({ updated: data?.length ?? 0 });
});
