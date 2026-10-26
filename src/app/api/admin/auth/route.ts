import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { env } from "@/lib/env";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Lets the admin UI check its own session.
export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`admin-login:${requestIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { message: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const body = await request.json().catch(() => ({}));
  const submitted = typeof body?.password === "string" ? body.password.trim() : "";
  const correct = env.adminPassword.trim();

  if (!correct) {
    return NextResponse.json(
      { message: "Admin password is not configured. Set PAGE_ACCESS_PASSWORD in .env.local and restart." },
      { status: 500 },
    );
  }
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(submitted)),
    crypto.subtle.digest("SHA-256", encoder.encode(correct)),
  ]);
  const ha = new Uint8Array(a);
  const hb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  if (diff === 0) {
    const token = await createAdminToken();
    if (!token) return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
    const response = NextResponse.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  }
  return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return response;
}
