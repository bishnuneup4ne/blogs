import { adminRoute, db, json } from "@/lib/api-helpers";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { wrapEmail } from "@/lib/mailer";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { rateLimit } from "@/lib/rate-limit";
import { routes, url as urlFor } from "@/lib/routes";

export const dynamic = "force-dynamic";

/* Emails a published post to every subscribed reader. Called from the editor's
   "Mail post" button and after publishing. Body: { slug } plus `test: true`
   to send only to the site owner. */
export const POST = adminRoute(async (req) => {
  const limit = rateLimit("mail-post", 12, 60 * 60 * 1000);
  if (!limit.ok) {
    return json({ error: "Too many mailouts — try again later." }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const test = body?.test === true;
  if (!slug) return json({ error: "slug is required" }, 400);

  const { data: post, error } = await db
    .from("fn_posts")
    .select("title, slug, summary, cover_url, topic_slug, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!post) return json({ error: "Post not found" }, 404);
  // Never blast unpublished drafts to the subscriber list.
  if (!test && post.status !== "published") {
    return json({ error: "Only published posts can be mailed to subscribers." }, 400);
  }

  const settings = await getSettings();
  const postUrl = urlFor(routes.post(post.slug));
  const subject = post.title;
  const cover = post.cover_url
    ? `<img src="${post.cover_url}" alt="" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:10px;margin:0 0 24px" />`
    : "";
  const html = `
    ${cover}
    <p style="margin:0 0 24px">${escapeHtml(post.summary ?? "")}</p>
    <p style="margin:0 0 8px">
      <a href="${postUrl}" style="display:inline-block;padding:13px 28px;border-radius:999px;background:#1a73e8;color:#ffffff;text-decoration:none;font-weight:500">Read the post</a>
    </p>`;

  let emails: string[];
  if (test) {
    const me = settings.identity.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(me)) {
      return json({ error: "Set a valid contact email in Settings first." }, 400);
    }
    emails = [me];
  } else {
    const { data: subs } = await db.from("fn_subscribers").select("email").eq("status", "subscribed").limit(1000);
    emails = [...new Set(((subs ?? []) as { email: string }[]).map((s) => s.email))].slice(0, 500);
  }
  if (!emails.length) return json({ sent: 0, message: "No subscribers yet" });

  const from = env.resendFrom || "onboarding@resend.dev";
  const replyTo = from.match(/<([^>]+)>/)?.[1] ?? from;
  let sent = 0;
  const failures: string[] = [];

  for (let i = 0; i < emails.length; i += 100) {
    const batch = await Promise.all(
      emails.slice(i, i + 100).map(async (email) => {
        const token = await unsubscribeToken(email);
        const params = `e=${encodeURIComponent(email)}&t=${token}`;
        return {
          from,
          to: [email],
          reply_to: replyTo,
          subject,
          html: wrapEmail({
            body: html,
            subject,
            siteUrl: site.url,
            unsubscribeUrl: `${site.url}/unsubscribe?${params}`,
          }),
          headers: {
            "List-Unsubscribe": `<${site.url}/api/unsubscribe?${params}>`,
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
    if (res.ok) sent += batch.length;
    else failures.push(`${res.status}: ${(await res.text()).slice(0, 160)}`);
  }

  return json({ sent, failed: failures.length, errors: failures.slice(0, 3) });
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
