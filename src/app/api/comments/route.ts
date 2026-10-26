import { NextResponse } from "next/server";
import { db, isMissingSchema } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { getAllPostSummaries } from "@/lib/data";
import { validateName } from "@/lib/comment-name";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resolve a slug through the same data layer that renders the page (DB with
 *  file fallback), so comments never 404 on a post that visibly exists. */
async function postExists(slug: string) {
  try {
    return (await getAllPostSummaries()).some((p) => p.slug === slug);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) return NextResponse.json({ comments: [] });
  if (!hasSupabase()) return NextResponse.json({ comments: [], available: false });

  const { data, error } = await db
    .from("fn_comments")
    .select("id, name, body, created_at, parent_id")
    .eq("post_slug", slug)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ comments: [], available: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(
    { comments: data ?? [], available: true },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } },
  );
}

export async function POST(request: Request) {
  const limit = rateLimit(`comment:${requestIp(request)}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many comments. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const settings = await getSettings();
  if (!settings.toggles.comments) return NextResponse.json({ error: "Comments are closed." }, { status: 403 });

  const b = await request.json().catch(() => null);
  if (typeof b?.website === "string" && b.website.trim()) return NextResponse.json({ ok: true });

  const slug = typeof b?.slug === "string" ? b.slug.trim().slice(0, 200) : "";
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 80) : "";
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  const body = typeof b?.body === "string" ? b.body.trim().slice(0, 3000) : "";
  // UUID shape guard before it ever reaches Postgres.
  const parentId =
    typeof b?.parentId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.parentId)
      ? b.parentId
      : null;

  if (!slug || !name || body.length < 3) {
    return NextResponse.json({ error: "A name and a message are required." }, { status: 400 });
  }
  const nameError = validateName(name);
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address, or leave it blank." }, { status: 400 });
  }
  if (!hasSupabase()) return NextResponse.json({ error: "Comments are unavailable right now." }, { status: 503 });

  if (!(await postExists(slug))) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const { error } = await db
    .from("fn_comments")
    .insert({ post_slug: slug, name, email, body, parent_id: parentId, status: "pending" });
  if (error) {
    const missing = isMissingSchema(error);
    return NextResponse.json(
      {
        error: missing
          ? "Comments aren't available right now. Please try again later."
          : "The comment could not be saved.",
        available: !missing,
      },
      { status: missing ? 503 : 500 },
    );
  }
  return NextResponse.json({ ok: true, pending: true }, { status: 201 });
}
