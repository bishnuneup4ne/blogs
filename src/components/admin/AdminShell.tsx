"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/components/admin/api";
import styles from "./AdminShell.module.scss";

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const svg = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV: NavGroup[] = [
  {
    label: "Write",
    items: [
      { href: "/admin", label: "Overview", exact: true, icon: svg("M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z") },
      { href: "/admin/posts", label: "Posts", icon: svg("M4 5h16M4 12h16M4 19h10") },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/media", label: "Media", icon: svg("M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6") },
      { href: "/admin/gallery", label: "Gallery", icon: svg("M3 7h5v10H3zM10 7h4v10h-4zM16 7h5v10h-5z") },
      { href: "/admin/topics", label: "Topics", icon: svg("M4 7h10l6 5-6 5H4z") },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/comments", label: "Comments", icon: svg("M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z") },
      { href: "/admin/messages", label: "Inbox", icon: svg("M3 6h18v12H3zM3 7l9 6 9-6") },
      { href: "/admin/subscribers", label: "Subscribers", icon: svg("M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6") },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: svg("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.4a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 10.4a7 7 0 0 0 0 3.2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.4h5l.4-2.4a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z"),
      },
    ],
  },
];

export function AdminShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    document.body.classList.add(styles.adminBody);
    return () => document.body.classList.remove(styles.adminBody);
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await api.post("/api/admin/logout", {});
    } catch {
      /* redirect below regardless */
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <Link href="/admin" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">B</span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Blog Studio</span>
            <span className={styles.brandKicker}>bishnuneupane13.com.np</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Admin">
          {NAV.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <p className={styles.navLabel}>{group.label}</p>
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.railFoot}>
          <Link href="/" className={styles.viewSite} target="_blank" rel="noreferrer">
            View site
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </Link>
          <button type="button" className={styles.signOut} onClick={signOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

export default AdminShell;