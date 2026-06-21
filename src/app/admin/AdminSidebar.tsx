"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const CONTENT_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/writeups", label: "Writeups", icon: "📝" },
  { href: "/admin/videos", label: "Videos", icon: "🎬" },
  { href: "/admin/categories", label: "Categories", icon: "🏷️" },
  { href: "/admin/projects", label: "Projects", icon: "💼" },
];

const SITE_LINKS = [
  { href: "/admin/gallery", label: "Gallery", icon: "🖼️" },
  { href: "/admin/image-settings", label: "Image Styling", icon: "🎨" },
  { href: "/admin/subscribers", label: "Subscribers", icon: "📬" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  { href: "/admin/trash", label: "Trash", icon: "🗑️" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <button
        className="admin-hamburger"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} style={{backgroundColor: "black"}}>
        <div className="admin-sidebar-logo">
          <h2>YNUBSEC</h2>
          <p>Admin Console</p>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-section">Content</p>
          {CONTENT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className={isActive(pathname, link.href, link.exact) ? "active" : ""}
            >
              <span className="admin-nav-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}

          <p className="admin-nav-section">Site</p>
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className={isActive(pathname, link.href) ? "active" : ""}
            >
              <span className="admin-nav-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/blogs" target="_blank" rel="noreferrer" className="admin-view-site">
            ↗ View site
          </Link>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
