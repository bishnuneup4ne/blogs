 "use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { SiteSettings } from "@/lib/settings";
import { ArrowRight, CloseIcon, MenuIcon, SearchIcon } from "@/components/icons/Icons";
import styles from "./SiteHeader.module.scss";

const SEARCH_TERMS = ["Malware", "Reverse engineering", "IOE", "Kathmandu"];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const nav = settings.nav.length ? settings.nav : [{ label: "Blog", href: "/blog" }];
  const brandInitial = settings.identity.authorName.trim().charAt(0).toUpperCase() || "B";

  useEffect(() => {
    // On article pages the reading bar takes over: hide the header at exactly
    // the moment the headline leaves the viewport, so the two never overlap.
    const article = document.querySelector("[data-article-progress]");
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      if (!article) {
        setHidden(false);
        return;
      }
      const h1 = document.querySelector("article h1, h1");
      const barH = 64;
      setHidden(h1 ? h1.getBoundingClientRect().top < -barH * 0.5 : window.scrollY > 120);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  // Overlays own the top edge while open; never hide under them.
  useEffect(() => {
    if (drawer || searchOpen) setHidden(false);
  }, [drawer, searchOpen]);

  useEffect(() => {
    setDrawer(false);
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!drawer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>('[aria-label="Close menu"]')?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
      if (event.key !== "Tab" || !drawerRef.current) return;
      const items = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'),
      ).filter((item) => item.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      burgerRef.current?.focus();
    };
  }, [drawer]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select") || target?.isContentEditable;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !typing) {
        event.preventDefault();
        setDrawer(false);
        setSearchOpen(true);
      }
      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setQuery("");
        searchButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  function runSearch(value: string) {
    const cleanQuery = value.trim();
    if (!cleanQuery) return;
    setSearchOpen(false);
    setDrawer(false);
    router.push(`/search?q=${encodeURIComponent(cleanQuery)}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  function openSearch() {
    setDrawer(false);
    setSearchOpen(true);
    // Focus after the width transition starts so the caret lands in the box.
    window.setTimeout(() => searchInputRef.current?.focus(), 60);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    searchButtonRef.current?.focus();
  }

  function toggleDrawer() {
    setSearchOpen(false);
    setDrawer((open) => !open);
  }

  function isActive(href: string) {
    // /categories is a legacy alias that redirects to /topics; treat them as
    // one destination so the nav item highlights on both.
    const canonical = href === "/categories" ? "/topics" : href;
    const current = pathname === "/categories" ? "/topics" : pathname;
    if (canonical === "/") return current === "/";
    if (canonical === "/blog") return current.startsWith("/blog");
    return current === canonical || current.startsWith(`${canonical}/`);
  }

  return (
    <div className={`${styles.shell} ${scrolled ? styles.shellScrolled : ""} ${hidden ? styles.shellHidden : ""}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={`${settings.identity.siteName} home`}>
            <span className={styles.brandText}>
              <span className={styles.brandKicker}>News from</span>
              <span className={styles.brandName}>{settings.identity.wordmark}</span>
            </span>
          </Link>

          <span className={styles.divider} aria-hidden="true" />

          <nav className={styles.nav} aria-label="Primary navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            {/* The field expands leftward over the nav so there's room to type. */}
            <div className={`${styles.searchBox} ${searchOpen ? styles.searchBoxOpen : ""}`}>
              <form onSubmit={submitSearch} className={styles.searchForm} role="search">
                <SearchIcon width={20} height={20} className={styles.searchGlyph} />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search stories, topics, and ideas…"
                  aria-label="Search the site"
                  autoComplete="off"
                  tabIndex={searchOpen ? 0 : -1}
                  className={styles.searchField}
                />
              </form>
              <button
                ref={searchButtonRef}
                type="button"
                className={styles.iconBtn}
                aria-label={searchOpen ? "Close search" : "Search"}
                aria-expanded={searchOpen}
                aria-keyshortcuts="/"
                onClick={() => (searchOpen ? closeSearch() : openSearch())}
              >
                {searchOpen ? <CloseIcon width={20} height={20} /> : <SearchIcon width={20} height={20} />}
              </button>
            </div>
            <Link href="/gallery" className={styles.iconBtn} aria-label="Open gallery">
              <ImagesIcon />
            </Link>
            {settings.toggles.newsletter && (
              <Link href="/newsletter" className={styles.cta}>
                <span>Newsletter</span>
                <ArrowRight className={styles.ctaArrow} width={16} height={16} />
              </Link>
            )}
            <button
              ref={burgerRef}
              type="button"
              className={styles.burger}
              onClick={toggleDrawer}
              aria-expanded={drawer}
              aria-controls="site-menu"
              aria-label={drawer ? "Close menu" : "Open menu"}
            >
              {drawer ? <CloseIcon width={22} height={22} /> : <MenuIcon width={22} height={22} />}
            </button>
          </div>

        </div>
      </header>

      {drawer && (
        <div className={styles.drawerBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDrawer(false);
        }}>
          <div ref={drawerRef} id="site-menu" className={styles.drawer} role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className={styles.drawerTop}>
              <Link href="/" className={styles.drawerBrand} aria-label={`${settings.identity.siteName} home`}>
                <span className={styles.brandMark}>{brandInitial}</span>
                <span className={styles.drawerBrandText}>
                  <span className={styles.drawerBrandName}>
                    <span className={styles.drawerBrandKicker}>News from</span>
                    <span>{settings.identity.wordmark}</span>
                  </span>
                </span>
              </Link>
              <button type="button" className={styles.drawerClose} onClick={() => setDrawer(false)} aria-label="Close menu">
                <CloseIcon width={22} height={22} />
              </button>
            </div>

            <form onSubmit={submitSearch} className={styles.drawerSearch} role="search">
              <SearchIcon width={19} height={19} />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive…" aria-label="Search the site" />
              <button type="submit" aria-label="Submit search"><ArrowRight width={18} height={18} /></button>
            </form>

            <p className={styles.drawerEyebrow}>EXPLORE</p>
            <nav className={styles.drawerNav} aria-label="Mobile navigation">
              {nav.map((item, index) => (
                <Link key={item.href} href={item.href} className={`${styles.drawerLink} ${isActive(item.href) ? styles.drawerLinkActive : ""}`} aria-current={isActive(item.href) ? "page" : undefined}>
                  <span className={styles.drawerIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.drawerLabel}>{item.label}</span>
                  <ArrowRight className={styles.drawerArrow} width={19} height={19} />
                </Link>
              ))}
            </nav>

            <div className={styles.drawerFoot}>
              {settings.toggles.newsletter && (
                <Link href="/newsletter" className={styles.drawerCta}>
                  <span>Get the newsletter</span><ArrowRight width={18} height={18} />
                </Link>
              )}
              <div className={styles.drawerMeta}>
                <a href={`mailto:${settings.identity.email}`}>Contact</a>
                <Link href="/gallery">Gallery</Link>
                <Link href="/privacy">Privacy</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 20.5h-9a2.5 2.5 0 0 1-2.5-2.5v-9" />
      <circle cx="12.8" cy="7.8" r="1.3" />
      <path d="m9 14.5 3-2.8 2.6 2.4 1.7-1.5 3.2 2.9" />
    </svg>
  );
}
