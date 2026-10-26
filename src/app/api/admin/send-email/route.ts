import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Google-newsletter-style wrapper: grey canvas, white rounded card, brand
 *  header, kicker rule under the subject, quiet footer with one-click opt-out. */
function wrapEmail({ body, subject, siteUrl, unsubscribeUrl }: { body: string; subject: string; siteUrl: string; unsubscribeUrl: string }) {
  const year = new Date().getFullYear();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:'Google Sans','Roboto',Arial,sans-serif;color:#202124;-webkit-font-smoothing:antialiased">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">
  <div style="padding:20px 28px 0">
    <a href="${siteUrl}" style="font-size:15px;font-weight:700;color:#5f6368;text-decoration:none;letter-spacing:.2px">News from Bishnu Neupane</a>
  </div>
  <div style="background:#ffffff;border-radius:16px;padding:32px 32px 8px;box-shadow:0 1px 2px rgba(60,64,67,.15)">
    <h1 style="margin:0 0 4px;font-size:22px;line-height:28px;font-weight:400;color:#202124">${subject}</h1>
    <div style="height:3px;width:44px;background:#1a73e8;border-radius:2px;margin:14px 0 22px"></div>
    <div style="font-size:15px;line-height:26px;color:#3c4043">${body}</div>
  </div>
  <div style="padding:22px 28px;color:#5f6368;font-size:12px;line-height:20px">
    You're receiving this because you subscribed at
    <a href="${siteUrl}" style="color:#1a73e8;text-decoration:none">${siteUrl.replace(/^https?:\/\//, "")}</a>.<br>
    <a href="${unsubscribeUrl}" style="color:#1a73e8;text-decoration:underline">Unsubscribe</a> — no hard feelings, one click, done.<br><br>
    &copy; ${year} Bishnu Neupane &middot; Kathmandu, Nepal
  </div>
</div>
</body></html>`;
}

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
          html: wrapEmail({ body: html, subject, siteUrl: site.url, unsubscribeUrl }),
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
