"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { SiteSettings } from "@/lib/settings";
import {
  ArrowRight,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  SocialIcon,
} from "@/components/icons/Icons";
import styles from "./SiteHeader.module.scss";

const SEARCH_TERMS = ["Malware", "Reverse engineering", "IOE", "Kathmandu"];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
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
      // The site menu drawer is part of the header itself — never hide for it.
      const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')];
      const foreign = dialogs.some((d) => !headerRef.current?.contains(d));
      overlayOpen.current = foreign;
      // Hiding the whole shell would take the close/zoom controls of the
      // lightbox with it, so overlays only dim the bar behind their scrim.
      headerRef.current?.toggleAttribute("data-overlay", foreign);
      if (!foreign) setHidden(false);
    }
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);

  const onBlog = pathname.startsWith("/blog");
  const nav = settings.nav.length > 0 ? settings.nav : [{ label: "Blog", href: "/blog" }];
  const brandInitial = settings.identity.authorName.trim().charAt(0).toUpperCase() || "B";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!onBlog || searchOpen || drawer) {
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
      // On article pages the reading-progress strip takes over the top edge.
      // Hand off at exactly the moment the big title leaves the viewport, so
      // the two never fight: otherwise the header slides away while the
      // headline is still on screen and the page jumps under it.
      if (document.querySelector("[data-article-progress]")) {
        const h1 = document.querySelector("article h1, h1");
        if (h1) {
          const barH = headerRef.current?.getBoundingClientRect().height ?? 72;
          setHidden(h1.getBoundingClientRect().top < -barH * 0.5);
        } else {
          setHidden(y >= 120);
        }
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
  }, [onBlog, searchOpen, drawer]);

  useEffect(() => {
    if (!drawer) return;
    const node = drawerRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const initial = node?.querySelector<HTMLElement>('[aria-label="Close menu"]');
      const first = initial ?? node?.querySelector<HTMLElement>("a, button, input");
      first?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Tab" || !node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>("a, button, input")).filter(
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

  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        searchLayerRef.current?.contains(target) ||
        searchButtonRef.current?.contains(target)
      ) {
        return;
      }
      closeSearch(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      openSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSearch() {
    setDrawer(false);
    setSearchOpen(true);
    const layer = searchLayerRef.current;
    if (!layer) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf(layer);
    gsap.set(layer, { visibility: "visible" });
    if (reduceMotion) {
      gsap.set(layer, { opacity: 1, y: 0 });
    } else {
      gsap.fromTo(
        layer,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.32, ease: "power3.out", overwrite: true },
      );
    }
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch(restoreFocus = true) {
    const layer = searchLayerRef.current;
    setSearchOpen(false);
    setQuery("");
    if (restoreFocus) searchButtonRef.current?.focus();
    if (!layer) return;
    gsap.killTweensOf(layer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(layer, { opacity: 0, y: -8, visibility: "hidden" });
      return;
    }
    gsap.to(layer, {
      opacity: 0,
      y: -8,
      duration: 0.2,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => gsap.set(layer, { visibility: "hidden" }),
    });
  }

  function runSearch(value: string) {
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  function toggleDrawer() {
    if (!drawer) closeSearch(false);
    setDrawer((open) => !open);
  }

  const shellClass = [hidden ? styles.shellHidden : styles.shell, scrolled ? styles.shellScrolled : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} ref={headerRef}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={`${settings.identity.siteName} home`}
          >
            <span className={styles.brandMark} aria-hidden="true">
              {brandInitial}
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandKicker}>{settings.identity.authorName}</span>
              <span className={styles.brandName}>{settings.identity.wordmark}</span>
            </span>
          </Link>

          <span className={styles.divider} aria-hidden="true" />

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
                  className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon ? (
                    <SocialIcon
                      name={item.icon}
                      width={16}
                      height={16}
                      className={styles.navIcon}
                    />
                  ) : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.actions}>
            <button
              ref={searchButtonRef}
              type="button"
              className={styles.searchTrigger}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="site-search"
              aria-keyshortcuts="/"
              onClick={openSearch}
            >
              <SearchIcon width={18} height={18} />
              <span className={styles.searchLabel}>Search</span>
              <kbd className={styles.searchKey} aria-hidden="true">
                /
              </kbd>
            </button>
            <Link href="/gallery" className={styles.galleryButton} aria-label="Gallery">
              <ImagesIcon />
            </Link>
            {settings.toggles.newsletter ? (
              <Link href="/newsletter" className={styles.cta}>
                Newsletter
                <ArrowRight className={styles.ctaArrow} width={16} height={16} />
              </Link>
            ) : null}
            <button
              ref={burgerRef}
              type="button"
              className={styles.burger}
              onClick={toggleDrawer}
              aria-expanded={drawer}
              aria-label={drawer ? "Close menu" : "Open menu"}
            >
              {drawer ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
            </button>
          </div>

          <div
            id="site-search"
            className={styles.searchLayer}
            ref={searchLayerRef}
            aria-hidden={!searchOpen}
          >
            <div className={styles.searchPanel} role="search">
              <div className={styles.searchTop}>
                <p className={styles.searchEyebrow}>Search the archive</p>
                <button
                  type="button"
                  className={styles.searchClose}
                  onClick={() => closeSearch()}
                  aria-label="Close search"
                  tabIndex={searchOpen ? 0 : -1}
                >
                  <CloseIcon width={20} height={20} />
                </button>
              </div>
              <form onSubmit={submitSearch} className={styles.searchForm}>
                <div className={styles.searchField}>
                  <SearchIcon width={22} height={22} className={styles.searchGlyph} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search stories, topics, albums…"
                    aria-label="Search"
                    className={styles.searchInput}
                    autoComplete="off"
                    tabIndex={searchOpen ? 0 : -1}
                  />
                  <kbd className={styles.searchKbd} aria-hidden="true">
                    Enter
                  </kbd>
                </div>
              </form>
              <div className={styles.searchQuick}>
                <span className={styles.searchQuickLabel}>Try</span>
                {SEARCH_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className={styles.searchChip}
                    onClick={() => runSearch(term)}
                    tabIndex={searchOpen ? 0 : -1}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {drawer ? (
        <div
          ref={drawerRef}
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className={styles.drawerInner}>
            <div className={styles.drawerTop}>
              <Link
                href="/"
                className={styles.drawerBrand}
                aria-label={`${settings.identity.siteName} home`}
              >
                <span className={styles.brandMark} aria-hidden="true">
                  {brandInitial}
                </span>
                <span className={styles.drawerBrandText}>
                  <span className={styles.brandKicker}>{settings.identity.authorName}</span>
                  <span className={styles.brandName}>{settings.identity.wordmark}</span>
                </span>
              </Link>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <CloseIcon width={22} height={22} />
              </button>
            </div>

            <form onSubmit={submitSearch} className={styles.drawerSearch} role="search">
              <SearchIcon width={20} height={20} className={styles.searchGlyph} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the archive…"
                aria-label="Search"
              />
            </form>

            <nav className={styles.drawerNav} aria-label="Primary">
              {nav.map((item, index) => {
                const active =
                  item.href === "/blog"
                    ? pathname.startsWith("/blog")
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.drawerLink}${active ? ` ${styles.drawerLinkActive}` : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={styles.drawerIndex}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.drawerLabel}>{item.label}</span>
                    <ArrowRight className={styles.drawerArrow} width={20} height={20} />
                  </Link>
                );
              })}
            </nav>

            <div className={styles.drawerFoot}>
              {settings.toggles.newsletter ? (
                <Link href="/newsletter" className={styles.drawerCta}>
                  <span>Subscribe to the newsletter</span>
                  <ArrowRight width={18} height={18} />
                </Link>
              ) : null}
              <div className={styles.drawerMeta}>
                <a href={`mailto:${settings.identity.email}`}>Contact</a>
                <Link href="/gallery">Gallery</Link>
                <Link href="/privacy">Privacy</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImagesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 20.5h-9a2.5 2.5 0 0 1-2.5-2.5v-9" />
      <circle cx="12.8" cy="7.8" r="1.3" />
      <path d="m9 14.5 3-2.8 2.6 2.4 1.7-1.5 3.2 2.9" />
    </svg>
  );
}
