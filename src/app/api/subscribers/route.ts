import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await getSettings()).toggles.newsletter) {
    return NextResponse.json({ ok: false, error: "The newsletter is closed right now." }, { status: 403 });
  }
  const limit = rateLimit(`subscribe:${requestIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const b = await request.json().catch(() => null);
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (!hasSupabase()) return NextResponse.json({ ok: true, offline: true });
  const { error } = await db
    .from("fn_subscribers")
    .upsert({ email, status: "subscribed", source: "Newsletter form" }, { onConflict: "email" });
  if (error) return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
