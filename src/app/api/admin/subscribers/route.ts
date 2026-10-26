import { adminRoute, body, db, email as validEmail, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const { data, error } = await db.from("fn_subscribers").select("*").order("joined_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ subscribers: data });
});

export const PATCH = adminRoute(async (req) => {
  const b = await body(req);
  const email = validEmail(b.email);
  if (!email) return json({ error: "a valid email is required" }, 400);
  const status = ["subscribed", "pending", "unsubscribed"].includes(String(b.status)) ? b.status : null;
  if (!status) return json({ error: "invalid status" }, 400);
  const { error } = await db.from("fn_subscribers").update({ status }).eq("email", email);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});

export const DELETE = adminRoute(async (req) => {
  const email = validEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return json({ error: "a valid email is required" }, 400);
  const { error } = await db.from("fn_subscribers").delete().eq("email", email);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
});
