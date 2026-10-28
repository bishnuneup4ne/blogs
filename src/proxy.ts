import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "./lib/adminSession";
import { resolveRewrite } from "./lib/rewrites";

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Renamed a post/topic/series? Old URLs 301 to the new one forever.
  if (pathname.startsWith("/blog/") || pathname.startsWith("/series/")) {
    const target = await resolveRewrite(pathname);
    if (target && target !== pathname) {
      const url = new URL(target + search, request.url);
      return NextResponse.redirect(url, 301);
    }
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await verifyAdminToken(token);

  if (pathname.startsWith("/admin/login")) {
    if (isAuthenticated) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/blog/:path*", "/series/:path*"],
};
