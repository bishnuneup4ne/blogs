"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollToPlugin);

/** Global GSAP behaviors: smooth anchor scrolling, TOC highlight motion,
 *  page-transition reveal. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Smooth scroll for in-page anchors (TOC, jump links). A new click always
  // supersedes the previous tween; a manual wheel/touch cancels it so the
  // animation never fights the user mid-scroll.
  useEffect(() => {
    let cancelled = false;
    function onClick(event: MouseEvent) {
      if (cancelled) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const link = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href")!.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      event.preventDefault();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const headerOffset = 88;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      if (reduceMotion) {
        window.scrollTo({ top: Math.max(top, 0) });
        history.replaceState(null, "", `#${id}`);
        el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
        return;
      }
      gsap.killTweensOf(window);
      gsap.to(window, {
        scrollTo: { y: Math.max(top, 0) },
        duration: 0.9,
        ease: "power3.inOut",
        overwrite: "auto",
        onComplete: () => {
          history.replaceState(null, "", `#${id}`);
          el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        },
      });
    }

    function cancel() {
      gsap.killTweensOf(window);
    }

    document.addEventListener("click", onClick);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
return () => {
      cancelled = true;
      document.removeEventListener("click", onClick);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, []);

  // Page transition — fade/slide content on route change
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    if (
      new URLSearchParams(window.location.search).has("nomotion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.set(main, { clearProps: "opacity,transform" });
      return;
    }
    gsap.fromTo(
      main,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" },
    );
  }, [pathname]);

  return <>{children}</>;
}
