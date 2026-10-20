import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { normalizeEmail, verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

/**
 * Unsubscribing always requires an explicit click on the confirmation page.
 * There is intentionally no GET handler: a state-changing GET gets triggered by
 * crawlers, link prefetchers and <img> loaders, which was silently dropping
 * subscribers.
 *
 * Accepts either a signed `t` (from a per-recipient email link) or a typed
 * `email` (manual form). Broadcasts currently go out via BCC batches, which
 * share one HTML body, so per-recipient tokens are not always available.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const email = body?.t
      ? await verifyUnsubscribeToken(body.t)
      : normalizeEmail(body?.email);

    if (!email) {
      return NextResponse.json(
        { error: "Please provide the email address you subscribed with." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("email", email)
      .select();

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe. Please try again." },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "This email is not in our subscriber list." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "You've been unsubscribed." }, { status: 200 });
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
