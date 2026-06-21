import type { Metadata } from "next";
import "./admin.css";
import { AdminToastProvider } from "@/lib/adminToast";

export const metadata: Metadata = {
  title: "Admin — Dashboard",
  robots: { index: false, follow: false },
};

// NOTE: No <html> or <body> here — root layout.tsx handles those.
// This layout wraps /admin/* routes inside the existing shell.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <AdminToastProvider>
        {children}
      </AdminToastProvider>
    </div>
  );
}
