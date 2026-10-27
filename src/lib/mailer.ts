import { env, hasSupabase } from "@/lib/env";
import { site } from "@/lib/site";
import { db } from "@/lib/supabase/server";
import { unsubscribeToken } from "@/lib/unsubscribe";

/** blog.google-style wrapper: grey canvas, white rounded card with a bold
 *  coloured header strip (blue = newsletter issue, red = alert, green = ok). */
export function wrapEmail({ body, subject, siteUrl, unsubscribeUrl, tone = "blue" }: { body: string; subject: string; siteUrl: string; unsubscribeUrl: string; tone?: string }) {
  const year = new Date().getFullYear();
  const strip = tone === "red" ? "#d93025" : tone === "green" ? "#188038" : "#1a73e8";
  const domain = siteUrl.replace(/^https?:\/\//, "");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f3f4;font-family:'Google Sans','Roboto',Arial,sans-serif;color:#202124;-webkit-font-smoothing:antialiased">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">
  <div style="padding:20px 28px 0">
    <a href="${siteUrl}" style="font-size:15px;font-weight:700;color:#5f6368;text-decoration:none;letter-spacing:.2px">News from ${domain}</a>
  </div>
  <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(60,64,67,.15)">
    <div style="background:${strip};padding:30px 32px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:500;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.78)">Newsletter &middot; ${domain}</p>
      <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;color:#ffffff">${subject}</h1>
    </div>
    <div style="padding:28px 32px 8px">
      <div style="font-size:15px;line-height:26px;color:#3c4043">${body}</div>
    </div>
    <div style="margin:24px 32px 0;border-top:1px solid #e8eaed"></div>
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

/** One send through Resend, wrapped in the site template, with working
 *  per-recipient unsubscribe links. Returns false when mail is not configured. */
export async function sendSiteEmail({ to, subject, html, tone = "blue" }: { to: string; subject: string; html: string; tone?: "blue" | "red" | "green" }): Promise<boolean> {
  if (!env.resendApiKey) return false;
  const token = await unsubscribeToken(to);
  const params = `e=${encodeURIComponent(to)}&t=${token}`;
  const unsubscribeUrl = `${site.url}/unsubscribe?${params}`;
  const oneClickUrl = `${site.url}/api/unsubscribe?${params}`;
  const from = env.resendFrom || "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: from.match(/<([^>]+)>/)?.[1] ?? from,
      subject,
      html: wrapEmail({ body: html, subject, siteUrl: site.url, unsubscribeUrl, tone }),
      headers: {
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  return res.ok;
}

const greeting = (email: string) => email.split("@")[0]?.replace(/[._-]+/g, " ") || "there";

/** Fire-and-forget welcome mail after a successful subscribe. */
export function sendWelcomeEmail(email: string) {
  if (!env.resendApiKey || !hasSupabase()) return;
  sendSiteEmail({
    to: email,
    tone: "green",
    subject: "You're on the list — welcome aboard",
    html: `<p>Hi ${greeting(email)},</p>
<p>Thanks for subscribing to <strong>News from ${site.name}</strong>. You'll get new posts by email — security deep-dives, field notes and the occasional photo essay. Roughly once a fortnight, never more.</p>
<p>While you're here: <a href="${site.url}/blog" style="color:#1a73e8">read the latest posts</a>.</p>
<p>— Bishnu</p>`,
  }).catch(() => {});
}

/** Fire-and-forget goodbye mail after an unsubscribe completes. */
export function sendGoodbyeEmail(email: string) {
  if (!env.resendApiKey) return;
  sendSiteEmail({
    to: email,
    tone: "red",
    subject: "You've been unsubscribed",
    html: `<p>Hello,</p><p>You have been unsubscribed from <strong>${site.name}</strong>. No further emails will be sent to this address.</p><p>Changed your mind? You can subscribe again any time at <a href="${site.url}/newsletter">${site.url.replace(/^https?:\/\//, "")}</a>.</p>`,
  }).catch(() => {});
}
