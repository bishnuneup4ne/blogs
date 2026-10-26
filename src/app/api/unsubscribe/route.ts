import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(`unsubscribe:${requestIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const b = await request.json().catch(() => null);
  const email = (typeof b?.email === "string" ? b.email : url.searchParams.get("e") ?? "").trim().toLowerCase().slice(0, 200);
  const token = (typeof b?.token === "string" ? b.token : url.searchParams.get("t") ?? "").trim().slice(0, 128);
  if (!email || !token || !(await verifyUnsubscribeToken(email, token))) {
    return NextResponse.json({ error: "This unsubscribe link is invalid or has expired." }, { status: 400 });
  }
  if (!hasSupabase()) return NextResponse.json({ ok: true });

  const { error } = await db.from("fn_subscribers").update({ status: "unsubscribed" }).eq("email", email);
  if (error) return NextResponse.json({ error: "Could not update the subscription." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
