import type { Metadata } from "next";
import "./admin.css";
import { AdminToastProvider } from "@/lib/adminToast";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin — Dashboard",
  robots: { index: false, follow: false },
};

// NOTE: No <html> or <body> here — root layout.tsx handles those.
// The shell (sidebar + main area) is provided once for all /admin/* pages.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <AdminToastProvider>
        <AdminShell>{children}</AdminShell>
      </AdminToastProvider>
    </div>
  );
}
