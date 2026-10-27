import { env, hasSupabase } from "@/lib/env";
import { site } from "@/lib/site";
import { db } from "@/lib/supabase/server";
import { unsubscribeToken } from "@/lib/unsubscribe";

const TONES = {
  blue: { band: "#1a73e8", ink: "#202124" },
  red: { band: "#d93025", ink: "#202124" },
  green: { band: "#188038", ink: "#202124" },
} as const;

/* Transactional template modelled on a clean account-email layout: grey canvas,
   a white card with a solid colour band across the top, roomy body copy, a
   hairline rule, then a bordered footer holding help and legal links.
   Tables + inline styles only — Gmail, Outlook and Apple Mail all render that
   the same way, and there is no <style> block to be stripped. */
export function wrapEmail({
  body,
  subject,
  siteUrl,
  unsubscribeUrl,
  tone = "blue",
}: {
  body: string;
  subject: string;
  siteUrl: string;
  unsubscribeUrl: string;
  tone?: "blue" | "red" | "green";
}) {
  const year = new Date().getFullYear();
  const { band } = TONES[tone] ?? TONES.blue;
  const domain = siteUrl.replace(/^https?:\/\//, "");
  const preheader = subject;
  const eyebrow = tone === "green" ? "Welcome" : tone === "red" ? "Account" : "Newsletter";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f3f4;-webkit-font-smoothing:antialiased">
<!-- Inbox preview line, hidden in the body -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f3f4">
  <tr>
    <td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:568px">

        <!-- White card -->
        <tr>
          <td style="background:#ffffff;border:1px solid #dadce0;border-radius:4px;overflow:hidden">

            <!-- Colour band -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${band};padding:26px 44px">
                  <p style="margin:0 0 6px;font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:11px;line-height:16px;letter-spacing:1.3px;text-transform:uppercase;color:rgba(255,255,255,.78)">${escape(eyebrow)}</p>
                  <a href="${siteUrl}" style="font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:19px;line-height:26px;font-weight:600;color:#ffffff;text-decoration:none">${escape(domain)}</a>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:36px 44px 8px;font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:15px;line-height:25px;color:#3c4043">
                  <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:500;color:#202124">${escape(subject)}</h1>
                  ${body}
                </td>
              </tr>
              <tr><td style="padding:8px 44px 36px"></td></tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 4px 0;font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:12px;line-height:20px;color:#5f6368">
            <p style="margin:0 0 10px">
              You're getting this because you subscribed at
              <a href="${siteUrl}" style="color:#1a73e8;text-decoration:none">${escape(domain)}</a>.
              <a href="${unsubscribeUrl}" style="color:#1a73e8;text-decoration:underline">Unsubscribe</a>
            </p>
            <p style="margin:0 0 14px">
              Questions? Just reply to this email — it reaches a real person.
            </p>
            <p style="margin:0;padding-top:14px;border-top:1px solid #e8eaed;color:#80868b">
              &copy; ${year} Bishnu Neupane &middot; Kathmandu, Nepal
              &nbsp;&middot;&nbsp;
              <a href="${siteUrl}/privacy" style="color:#5f6368;text-decoration:underline">Privacy</a>
              &nbsp;&middot;&nbsp;
              <a href="${siteUrl}/blog" style="color:#5f6368;text-decoration:underline">All posts</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    html: `<p style="margin:0 0 16px">Hi ${escape(greeting(email))},</p>
<p style="margin:0 0 16px">Thanks for subscribing to <strong>News from ${escape(site.name)}</strong>. You'll get new posts by email — security deep-dives, field notes and the occasional photo essay. Roughly once a fortnight, never more.</p>
<p style="margin:0 0 24px">While you're here, the latest posts are waiting:</p>
<p style="margin:0"><a href="${site.url}/blog" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#188038;color:#ffffff;text-decoration:none;font-weight:500">Read the blog</a></p>`,
  }).catch(() => {});
}

/** Fire-and-forget goodbye mail after an unsubscribe completes. */
export function sendGoodbyeEmail(email: string) {
  if (!env.resendApiKey) return;
  sendSiteEmail({
    to: email,
    tone: "red",
    subject: "You've been unsubscribed",
    html: `<p style="margin:0 0 16px">Hello,</p>
<p style="margin:0 0 16px">You have been unsubscribed from <strong>${escape(site.name)}</strong>. No further emails will be sent to this address.</p>
<p style="margin:0 0 24px">Changed your mind? You can subscribe again any time:</p>
<p style="margin:0"><a href="${site.url}/newsletter" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#d93025;color:#ffffff;text-decoration:none;font-weight:500">Subscribe again</a></p>`,
  }).catch(() => {});
}
