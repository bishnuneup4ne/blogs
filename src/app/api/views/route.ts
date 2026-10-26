import { NextResponse } from "next/server";
import { db, isMissingSchema } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!hasSupabase()) return NextResponse.json({ ok: true });
    if (!(await getSettings()).toggles.views) return NextResponse.json({ ok: true, skipped: true });
    const limit = rateLimit(`views:${requestIp(request)}`, 60, 60 * 1000);
    if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.slice(0, 200) : "";
    if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
    const { data: post, error: postError } = await db
      .from("fn_posts")
      .select("id")
      .eq("slug", slug)
      .in("status", ["published", "live"])
      .maybeSingle();
    if (postError) return NextResponse.json({ ok: true, skipped: isMissingSchema(postError) });
    if (!post) return NextResponse.json({ ok: false }, { status: 404 });

    const counted = await db.rpc("fn_increment_view", { p_slug: slug });
    if (!counted.error) return NextResponse.json({ ok: Boolean(counted.data) });

    const day = new Date().toISOString().slice(0, 10);
    const { data: existing } = await db
      .from("fn_post_views")
      .select("views")
      .eq("post_id", post.id)
      .eq("day", day)
      .maybeSingle();
    if (existing) {
      await db
        .from("fn_post_views")
        .update({ views: (existing.views ?? 0) + 1 })
        .eq("post_id", post.id)
        .eq("day", day);
    } else {
      await db.from("fn_post_views").insert({ post_id: post.id, day, views: 1 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, skipped: true });
  }
}
