import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VOTER_COOKIE = "fn_voter";

/** Anonymous per-browser token so a reload keeps the same vote. */
function readVoter(request: Request): string | null {
  const match = new RegExp(`(?:^|;\\s*)${VOTER_COOKIE}=([^;]+)`).exec(request.headers.get("cookie") ?? "");
  return match ? decodeURIComponent(match[1]).slice(0, 64) : null;
}

async function countsFor(slug: string) {
  const { data, error } = await db.from("fn_reactions").select("value").eq("post_slug", slug);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { value: string }[];
  return {
    likes: rows.filter((r) => r.value === "like").length,
    dislikes: rows.filter((r) => r.value === "dislike").length,
  };
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug || !hasSupabase()) return NextResponse.json({ likes: 0, dislikes: 0, available: false });
  try {
    return NextResponse.json({ ...(await countsFor(slug)), available: true });
  } catch {
    return NextResponse.json({ likes: 0, dislikes: 0, available: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`reaction:${requestIp(request)}`, 30, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many clicks. Slow down." }, { status: 429 });
  if (!hasSupabase()) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const b = await request.json().catch(() => null);
  const slug = typeof b?.slug === "string" ? b.slug.trim().slice(0, 200) : "";
  const value = b?.value === "like" || b?.value === "dislike" ? b.value : null;
  if (!slug) return NextResponse.json({ error: "Missing post." }, { status: 400 });

  let voter = readVoter(request);
  if (!voter) {
    voter = crypto.randomUUID();
  }

  try {
    // One vote per browser per post: clear, then insert unless un-reacting.
    const { error: delError } = await db.from("fn_reactions").delete().eq("post_slug", slug).eq("voter", voter);
    if (delError) throw new Error(delError.message);
    if (value) {
      const { error: insError } = await db.from("fn_reactions").insert({ post_slug: slug, value, voter });
      if (insError) throw new Error(insError.message);
    }

    const res = NextResponse.json({ ...(await countsFor(slug)), available: true });
    res.cookies.set(VOTER_COOKIE, voter, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Could not save your reaction.", available: false }, { status: 503 });
  }
}
