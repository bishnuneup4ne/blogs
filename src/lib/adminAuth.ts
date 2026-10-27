import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "./adminSession";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : false;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Guard for admin API routes and pages. */
export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  return null;
}
