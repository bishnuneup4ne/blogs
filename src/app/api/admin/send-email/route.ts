import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/supabase/server";
import { env, hasSupabase } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { wrapEmail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!env.resendApiKey) return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
  const limit = rateLimit(`send-email:${requestIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sends. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const b = (await request.json().catch(() => null)) ?? {};
  const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 200) : "";
  const html = typeof b.html === "string" ? b.html.slice(0, 500_000) : "";
  const tone = b.tone === "red" || b.tone === "green" ? b.tone : "blue";
  if (!subject || !html) return NextResponse.json({ error: "subject and html are required" }, { status: 400 });

  let emails: string[];
  if (b.test === true) {
    const settings = await getSettings();
    const target = settings.identity.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      return NextResponse.json({ error: "Set a valid contact email in Settings before sending a test." }, { status: 400 });
    }
    emails = [target];
  } else {
    const { data: subs, error } = await db
      .from("fn_subscribers")
      .select("email")
      .eq("status", "subscribed")
      .limit(1000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    emails = [...new Set((subs ?? []).map((s: { email: string }) => s.email))].slice(0, 500);
  }
  if (!emails.length) return NextResponse.json({ sent: 0, message: "No subscribers" });

  const from = env.resendFrom || "onboarding@resend.dev";
  const replyTo = from.match(/<([^>]+)>/)?.[1] ?? from;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const batch = await Promise.all(
      emails.slice(i, i + 100).map(async (email) => {
        const token = await unsubscribeToken(email);
        const params = `e=${encodeURIComponent(email)}&t=${token}`;
        const unsubscribeUrl = `${site.url}/unsubscribe?${params}`;
        const oneClickUrl = `${site.url}/api/unsubscribe?${params}`;
        return {
          from,
          to: [email],
          reply_to: replyTo,
          subject,
          html: wrapEmail({ body: html, subject, siteUrl: site.url, unsubscribeUrl, tone }),
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      }),
    );
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      sent += batch.length;
    } else {
      failed += batch.length;
      const text = await res.text();
      errors.push(text.slice(0, 200));
    }
    if (i + 100 < emails.length) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return NextResponse.json({ sent, failed, errors: errors.slice(0, 3), test: b.test === true });
}
