import { adminRoute, body, db, json, str } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const POST = adminRoute(async (req) => {
  const b = await body(req);
  const name = str(b.name, 120)?.trim();
  const email = str(b.email, 200)?.trim().toLowerCase();
  const message = str(b.message, 5000)?.trim();
  if (!name || !email || !message) return json({ error: "name, email and message are required" }, 400);
  const { data, error } = await db.from("fn_messages").insert({
    name,
    email,
    subject: str(b.subject, 200) ?? "",
    message,
    is_read: b.is_read === true,
  }).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ message: data }, 201);
});

export const GET = adminRoute(async () => {
  const { data, error } = await db.from("fn_messages").select("*").order("created_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ messages: data });
});
