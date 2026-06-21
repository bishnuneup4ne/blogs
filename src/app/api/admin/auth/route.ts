import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;
  const correctPassword = process.env.PAGE_ACCESS_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
  }

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.headers.set(
      "Set-Cookie",
      cookie.serialize("admin_auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "strict",
        path: "/",
      })
    );
    return response;
  }

  return NextResponse.json({ message: "Incorrect password" }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    cookie.serialize("admin_auth", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    })
  );
  return response;
}
