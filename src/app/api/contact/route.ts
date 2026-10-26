import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!(await getSettings()).toggles.contactForm) {
    return NextResponse.json({ ok: false, error: "The contact form is closed." }, { status: 403 });
  }
  const limit = rateLimit(`contact:${requestIp(request)}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many messages. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const b = await request.json().catch(() => null);
  if (typeof b?.website === "string" && b.website.trim()) return NextResponse.json({ ok: true });
  const name = typeof b?.name === "string" ? b.name.trim().slice(0, 120) : "";
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase().slice(0, 200) : "";
  const subject = typeof b?.subject === "string" ? b.subject.trim().slice(0, 200) : "";
  const message = typeof b?.message === "string" ? b.message.trim().slice(0, 5000) : "";
  if (!name || !EMAIL_RE.test(email) || message.length < 10) {
    return NextResponse.json({ ok: false, error: "Name, a valid email and a message of at least 10 characters are required." }, { status: 400 });
  }
  if (!hasSupabase()) return NextResponse.json({ ok: true, offline: true });
  const { error } = await db.from("fn_messages").insert({ name, email, subject, message });
  if (error) return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
