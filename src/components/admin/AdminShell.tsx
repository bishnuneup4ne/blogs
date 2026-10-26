"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApiCollection, type ApiPost } from "./api";
import { SearchIcon } from "@/components/icons/Icons";
import { site } from "@/lib/site";
import styles from "./AdminShell.module.scss";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: "grid", exact: true },
      { href: "/admin/posts", label: "Posts", icon: "doc" },
      { href: "/admin/media", label: "Media", icon: "image" },
      { href: "/admin/gallery", label: "Gallery", icon: "folder" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/comments", label: "Comments", icon: "chat" },
      { href: "/admin/messages", label: "Inbox", icon: "inbox" },
      { href: "/admin/subscribers", label: "Subscribers", icon: "mail" },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/topics", label: "Topics", icon: "tag" },
      { href: "/admin/series", label: "Series", icon: "layers" },
      { href: "/admin/authors", label: "Authors", icon: "user" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: "gear" }],
  },
];

const INITIALS = site.name
  .split(" ")
  .map((part) => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

const TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/posts": "Posts",
  "/admin/posts/new": "New post",
  "/admin/media": "Media",
  "/admin/gallery": "Gallery",
  "/admin/comments": "Comments",
  "/admin/messages": "Inbox",
  "/admin/topics": "Topics",
  "/admin/series": "Series",
  "/admin/authors": "Authors",
  "/admin/subscribers": "Subscribers",
  "/admin/settings": "Settings",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return <AdminChrome>{children}</AdminChrome>;
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const drafts = postsC.items.filter((p) => p.status !== "published").length;

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNav]);

  async function signOut() {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => null);
    router.push("/admin/login");
    router.refresh();
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/admin/posts?q=${encodeURIComponent(query)}` : "/admin/posts");
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/admin/posts/") && pathname.endsWith("/edit") ? "Edit post" : "Studio");

  return (
    <div className={`studio ${styles.shell}`}>
      <aside id="admin-rail" className={mobileNav ? `${styles.rail} ${styles.railOpen}` : styles.rail}>
        <Link href="/admin" className={styles.brand} aria-label="Studio home">
          <span className={styles.brandText}>
            <span className={styles.brandName}>
              <span className={styles.brandPrefix}>News from </span>
              {site.name}
            </span>
            <span className={styles.brandKicker}>Studio</span>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="Admin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <p className={styles.navLabel}>{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item) ? styles.navItemActive : styles.navItem}
                  aria-current={isActive(item) ? "page" : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.href === "/admin/posts" && drafts > 0 ? <span className={styles.badge}>{drafts}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.railFoot}>
          <Link href="/" className={styles.viewSite}>
            <NavIcon name="external" />
            <span>View site</span>
          </Link>
          <button type="button" className={styles.signOut} onClick={() => void signOut()}>
            <NavIcon name="logout" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {mobileNav ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNav}
            aria-controls="admin-rail"
          >
            <NavIcon name="menu" />
          </button>
          <p className={styles.crumb}>
            <span>Studio</span>
            <i aria-hidden="true">/</i>
            <strong>{title}</strong>
          </p>

          <form className={styles.search} role="search" onSubmit={submitSearch}>
            <SearchIcon width={18} height={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search posts"
              aria-label="Search posts"
            />
          </form>

          <Link href="/admin/posts/new" className={styles.newBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New post
          </Link>
          <Link href="/admin/settings" className={styles.avatarBtn} aria-label="Studio settings">
            {INITIALS}
          </Link>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    doc: (
      <>
        <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V4a.5.5 0 0 1 0-.5Z" />
        <path d="M14 3.5V8h4M9.5 12h6M9.5 15.5h6" />
      </>
    ),
    image: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
      </>
    ),
    tag: (
      <>
        <path d="M3.5 11.5v-7A1 1 0 0 1 4.5 3.5h7l9 9-8 8-9-9Z" />
        <circle cx="8" cy="8" r="1.4" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3.5 8.5 4.7L12 13 3.5 8.2 12 3.5Z" />
        <path d="m3.5 12.2 8.5 4.8 8.5-4.8M3.5 16.2l8.5 4.8 8.5-4.8" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20.5c.8-3.7 3.8-5.7 7.5-5.7s6.7 2 7.5 5.7" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2" />
        <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
      </>
    ),
    folder: (
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6c.5 0 .9.2 1.2.6l1 1.4h7.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5Z" />
    ),
    chat: (
      <>
        <path d="M4.5 5.5h15a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 3.5v-14a1 1 0 0 1 0-1Z" />
      </>
    ),
    inbox: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2" />
        <path d="M3 13.5h5l1.5 2.5h5L16 13.5h5" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.5v2.2M12 18.3v2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M3.5 12h2.2M18.3 12h2.2M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
      </>
    ),
    external: (
      <>
        <path d="M14 4.5h5.5V10M19 5l-8 8" />
        <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    logout: (
      <>
        <path d="M10 4.5H5.5A1.5 1.5 0 0 0 4 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
        <path d="M15 8.5 18.5 12 15 15.5M9 12h9.5" />
      </>
    ),
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
