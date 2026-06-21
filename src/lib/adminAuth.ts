import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("admin_auth");
  return authToken?.value === "authenticated";
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
