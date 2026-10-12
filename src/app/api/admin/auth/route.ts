import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";
import { createAdminToken, ADMIN_COOKIE_NAME } from "@/lib/adminSession";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Equal-length hex strings compared without early exit.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const submitted = typeof body?.password === "string" ? body.password.trim() : "";

  // Trim the env value too, so accidental trailing whitespace / CRLF in the
  // .env file can never silently break the comparison.
  const correctPassword = process.env.PAGE_ACCESS_PASSWORD?.trim() ?? "";

  if (!correctPassword) {
    return NextResponse.json(
      {
        message:
          "Admin password is not configured. Add PAGE_ACCESS_PASSWORD to your .env / .env.local (or Vercel → Settings → Environment Variables), then fully restart the dev server.",
      },
      { status: 500 },
    );
  }

  const [submittedHash, correctHash] = await Promise.all([
    sha256Hex(submitted),
    sha256Hex(correctPassword),
  ]);

  if (constantTimeEqual(submittedHash, correctHash)) {
    const token = await createAdminToken();
    if (!token) {
      return NextResponse.json({ message: "Session could not be created." }, { status: 500 });
    }
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.headers.set(
      "Set-Cookie",
      cookie.serialize(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "strict",
        path: "/",
      }),
    );
    return response;
  }

  return NextResponse.json(
    {
      message:
        "Incorrect password. It must exactly match PAGE_ACCESS_PASSWORD in your .env file. Tip: after editing .env you must fully restart the dev server (Ctrl+C, then npm run dev again) — env changes are not hot-reloaded.",
    },
    { status: 401 },
  );
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    cookie.serialize(ADMIN_COOKIE_NAME, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    }),
  );
  return response;
}
