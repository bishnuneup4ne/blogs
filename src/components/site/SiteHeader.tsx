"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { SiteSettings } from "@/lib/settings";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons/Icons";
import styles from "./SiteHeader.module.scss";

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLAnchorElement>(null);
  const searchLayerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // While a full-screen overlay (lightbox, comments drawer) is open it covers
  // the whole viewport — but some mobile browsers keep handing taps to the
  // sticky header underneath. Nodding it out removes the phantom layer.
  const overlayOpen = useRef(false);

  useEffect(() => {
    function check() {
      overlayOpen.current = !!document.querySelector('[role="dialog"][aria-modal="true"]');
      setHidden(overlayOpen.current);
    }
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);

  const onBlog = pathname.startsWith("/blog");
  const nav = settings.nav.length > 0 ? settings.nav : [{ label: "Blog", href: "/blog" }];

  useEffect(() => {
    if (!onBlog) {
      setHidden(false);
      return;
    }
    let lastY = window.scrollY;
    let frame = 0;

    function update() {
      frame = 0;
      if (overlayOpen.current) return;
      const y = window.scrollY;
      if (gsap.isTweening(window)) {
        lastY = y;
        return;
      }
      // On article pages the reading-progress strip takes over the top edge:
      // hide the main header as soon as you start scrolling.
      if (document.querySelector('[class*="ArticleProgress"]')) {
        setHidden(y >= 120);
        lastY = y;
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < 6) return;
      if (y < 120 || delta < 0) setHidden(false);
      else if (delta > 0) setHidden(true);
      lastY = y;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [onBlog]);

  useEffect(() => {
    if (drawer || searchOpen) setHidden(false);
  }, [drawer, searchOpen]);

  useEffect(() => {
    if (!drawer) return;
    const node = drawerRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => node?.querySelector<HTMLElement>("a, button")?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Tab" || !node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>("a, button")).filter(
        (el) => el.getClientRects().length > 0,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      burgerRef.current?.focus();
    };
  }, [drawer]);

  useEffect(() => {
    setDrawer(false);
    closeSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawer(false);
        if (searchLayerRef.current?.getAttribute("aria-hidden") === "false") closeSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function openSearch() {
    const layer = searchLayerRef.current;
    const inner = innerRef.current;
    const wordmark = wordmarkRef.current;
    setSearchOpen(true);
    if (!layer || !inner || !wordmark) return;
    const gap = 32;
    const target = Math.max(inner.clientWidth - wordmark.offsetWidth - gap, 280);
    gsap.killTweensOf(layer);
    gsap.set(layer, { width: 0, opacity: 0, display: "flex" });
    gsap.to(layer, { width: target, opacity: 1, duration: 0.5, ease: "power3.out" });
  }

  function closeSearch(restoreFocus = true) {
    const layer = searchLayerRef.current;
    setSearchOpen(false);
    setQuery("");
    if (restoreFocus) searchButtonRef.current?.focus();
    if (!layer) return;
    gsap.killTweensOf(layer);
    gsap.to(layer, {
      width: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => gsap.set(layer, { display: "none" }),
    });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={hidden ? styles.shellHidden : styles.shell} ref={headerRef}>
      <header className={styles.header}>
        <div className={styles.headerInner} ref={innerRef}>
          <Link
            href="/"
            className={styles.wordmark}
            ref={wordmarkRef}
            aria-label={`${settings.identity.siteName} home`}
          >
            <span className={styles.wordmarkPrefix}>News from&nbsp;</span>
            {settings.identity.wordmark}
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            {nav.map((item) => {
              const active =
                item.href === "/blog"
                  ? pathname.startsWith("/blog")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? `${styles.feedLink} ${styles.feedLinkActive}` : styles.feedLink}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.actions}>
            <button
              ref={searchButtonRef}
              type="button"
              className={styles.iconButton}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="site-search"
              onClick={openSearch}
            >
              <SearchIcon width={24} height={24} />
            </button>
            <Link href="/gallery" className={styles.galleryButton} aria-label="Gallery">
              <ImagesIcon />
              <span className={styles.galleryLabel}>Gallery</span>
            </Link>
            {settings.toggles.newsletter ? (
              <Link href="/newsletter" className={styles.cta}>
                Newsletter
              </Link>
            ) : null}
            <button
              ref={burgerRef}
              type="button"
              className={styles.burger}
              onClick={() => setDrawer((v) => !v)}
              aria-expanded={drawer}
              aria-label={drawer ? "Close menu" : "Open menu"}
            >
              {drawer ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
            </button>
          </div>

          <div id="site-search" className={styles.searchLayer} ref={searchLayerRef} aria-hidden={!searchOpen}>
            <form onSubmit={submitSearch} className={styles.searchForm} role="search">
              <SearchIcon width={22} height={22} className={styles.searchGlyph} />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search writing, topics, albums…"
                aria-label="Search"
                className={styles.searchInput}
                tabIndex={searchOpen ? 0 : -1}
              />
              <button
                type="button"
                className={styles.searchClose}
                onClick={() => closeSearch()}
                aria-label="Close search"
                tabIndex={searchOpen ? 0 : -1}
              >
                <CloseIcon width={22} height={22} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {drawer ? (
        <div ref={drawerRef} className={styles.drawer} role="dialog" aria-modal="true" aria-label="Site menu">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={styles.drawerLink}>
              {item.label}
            </Link>
          ))}
          <div className={styles.drawerSection}>
            <p className={styles.drawerTitle}>More</p>
            <Link href="/search" className={styles.drawerLink}>Search</Link>
            <Link href="/newsletter" className={styles.drawerLink}>Newsletter</Link>
            <Link href="/gallery" className={styles.drawerLink}>Gallery</Link>
            <Link href="/privacy" className={styles.drawerLink}>Privacy</Link>
          </div>
          <a href={`mailto:${settings.identity.email}`} className={`${styles.drawerCta} btn btn-primary`}>
            Contact
          </a>
        </div>
      ) : null}
    </div>
  );
}

function ImagesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 20.5h-9a2.5 2.5 0 0 1-2.5-2.5v-9" />
      <circle cx="12.8" cy="7.8" r="1.3" />
      <path d="m9 14.5 3-2.8 2.6 2.4 1.7-1.5 3.2 2.9" />
    </svg>
  );
}
