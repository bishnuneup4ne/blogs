import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { cachedQuery } from "@/lib/apiCache";

interface Stats {
  published: number;
  drafts: number;
  subscribers: number;
  activeSubscribers: number;
}

// Cheap parallel HEAD-count queries — no row payloads over the wire.
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await cachedQuery<Stats>("admin:stats", 30_000, async () => {
    const [pub, all, subs, active] = await Promise.all([
      supabaseAdmin
        .from("writeups")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("status", "Published"),
      supabaseAdmin
        .from("writeups")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("subscribers")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("status", "subscribed"),
    ]);

    const firstError = pub.error || all.error || subs.error || active.error;
    if (firstError) return { data: null, error: { message: firstError.message } };

    return {
      data: {
        published: pub.count ?? 0,
        drafts: Math.max(0, (all.count ?? 0) - (pub.count ?? 0)),
        subscribers: subs.count ?? 0,
        activeSubscribers: active.count ?? 0,
      },
      error: null,
    };
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
