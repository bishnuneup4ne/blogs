import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "./adminSession";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
