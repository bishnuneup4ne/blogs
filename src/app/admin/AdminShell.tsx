"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

/**
 * Consistent admin shell. The fixed sidebar is provided once here for every
 * admin page, except the login screen and the standalone diagram builder
 * (both are full-screen and manage their own chrome).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const chromeless =
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname.startsWith("/admin/diagram-builder");

  if (chromeless) {
    return <>{children}</>;
  }

  return (
    <>
      <AdminSidebar />
      {children}
    </>
  );
}
