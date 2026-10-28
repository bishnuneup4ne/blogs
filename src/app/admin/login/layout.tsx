import type { Metadata } from "next";
import { FeedbackProvider } from "@/components/admin/Feedback";
import "../admin.css";

/* The sign-in page renders on its own — no studio sidebar or command bar. */
export const metadata: Metadata = {
  title: "Sign in · Studio",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
