"use client";

import { useEffect } from "react";

const VISITOR_KEY = "bn_visitor_id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// Measures visible time-on-page and deepest scroll, then reports once when the
// visitor leaves (pagehide / tab hidden). sendBeacon survives page unload.
export function AnalyticsTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    const visitorId = getVisitorId();
    let activeMs = 0;
    let last = Date.now();
    let maxScroll = 0;
    let sent = false;

    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") activeMs += now - last;
      last = now;
    };

    const measureScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, Math.round((window.scrollY / total) * 100)) : 100;
      if (pct > maxScroll) maxScroll = pct;
    };

    const send = () => {
      if (sent) return;
      tick();
      sent = true;
      const payload = JSON.stringify({
        slug,
        visitorId,
        readSeconds: Math.round(activeMs / 1000),
        maxScroll,
        referrer: document.referrer || undefined,
      });
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon("/api/track", blob)) {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => {
      tick();
      if (document.visibilityState === "hidden") send();
    };

    const interval = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", send);
    window.addEventListener("scroll", measureScroll, { passive: true });
    measureScroll();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", send);
      window.removeEventListener("scroll", measureScroll);
      send();
    };
  }, [slug]);

  return null;
}
