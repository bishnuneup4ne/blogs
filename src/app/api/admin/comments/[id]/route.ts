import { revalidatePath } from "next/cache";
import { adminRoute, body, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const PATCH = adminRoute(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await body(req);
  const status = String(b.status ?? "");
  if (!["pending", "approved", "spam"].includes(status)) return json({ error: "invalid status" }, 400);
  const { data, error } = await db.from("fn_comments").update({ status }).eq("id", id).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Not found" }, 404);
  revalidatePath("/blog/[slug]", "page");
  return json({ comment: data });
});

export const DELETE = adminRoute(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { error } = await db.from("fn_comments").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  revalidatePath("/blog/[slug]", "page");
  return json({ ok: true });
});
