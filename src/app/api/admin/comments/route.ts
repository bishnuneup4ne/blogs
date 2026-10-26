import { adminRoute, db, json } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => {
  const { data, error } = await db
    .from("fn_comments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ comments: data });
});
