import { NextRequest, NextResponse, after } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const SLUG_RE = /^[a-zA-Z0-9_-]{1,200}$/;
const VISITOR_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;

function deviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|android(?!.*mobile)|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

// Public, fire-and-forget read tracking. Deliberately permissive on output
// (always 204) but strict on input; payload is validated and size-capped.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new NextResponse(null, { status: 204 });
    }

    const { slug, visitorId } = body as { slug?: unknown; visitorId?: unknown };
    if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
      return new NextResponse(null, { status: 204 });
    }

    const readSeconds = Number(body.readSeconds);
    const maxScroll = Number(body.maxScroll);
    const safeRead =
      Number.isFinite(readSeconds) && readSeconds >= 0
        ? Math.min(Math.round(readSeconds), 36_000)
        : 0;
    const safeScroll =
      Number.isFinite(maxScroll) && maxScroll >= 0
        ? Math.min(Math.round(maxScroll), 100)
        : 0;

    const visitor =
      typeof visitorId === "string" && VISITOR_RE.test(visitorId) ? visitorId : null;

    const h = request.headers;
    const rawCountry =
      h.get("cf-ipcountry") ||
      h.get("x-vercel-ip-country") ||
      h.get("x-country-code") ||
      "";
    const country = COUNTRY_RE.test(rawCountry.toUpperCase())
      ? rawCountry.toUpperCase()
      : null;

    let referrer: string | null = null;
    if (typeof body.referrer === "string" && body.referrer) {
      try {
        referrer = new URL(body.referrer).origin.slice(0, 200);
      } catch {
        referrer = null;
      }
    }

    const device = deviceFromUserAgent(h.get("user-agent") ?? "");

    // Respond immediately; the insert runs after the response is sent.
    after(async () => {
      await supabaseAdmin.from("page_views").insert({
        slug,
        visitor_id: visitor,
        country,
        referrer,
        device,
        read_seconds: safeRead,
        max_scroll: safeScroll,
      });
    });
  } catch (err) {
    console.error("track error:", err);
  }

  return new NextResponse(null, { status: 204 });
}
