import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export interface HomeSection {
  id: string;
  enabled: boolean;
  title: string;
  href?: string;
  linkLabel?: string;
}

export interface SiteSettings {
  identity: {
    wordmark: string;
    siteName: string;
    tagline: string;
    email: string;
    location: string;
    avatarUrl: string;
  };
  hero: { title: string; standfirst: string };
  socials: { label: string; href: string }[];
  toggles: { newsletter: boolean; comments: boolean; views: boolean; contactForm: boolean };
  nav: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
  homeSections: HomeSection[];
}

export const DEFAULT_SETTINGS: SiteSettings = {
  identity: {
    wordmark: "bishnuneup4ne",
    siteName: "bishnuneup4ne — Security Newsroom",
    tagline: "Security, systems and the life around them.",
    email: "contact@bishnuneupane13.com.np",
    location: "Kathmandu, Nepal",
    avatarUrl: "/images/avatar.svg",
  },
  hero: {
    title: "Notes worth keeping.",
    standfirst: "Security engineering, systems, the trail and everything between — written down as it happens.",
  },
  socials: [
    { label: "GitHub", href: "https://github.com/bishnuneup4ne" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/bishnuneup4ne/" },
    { label: "Threads", href: "https://www.threads.com/@bishnuneup4ne" },
    { label: "Email", href: "mailto:bishnuneup4ne@gmail.com" },
  ],
  toggles: { newsletter: true, comments: true, views: true, contactForm: true },
  nav: [
    { label: "Blog", href: "/blog" },
    { label: "Topics", href: "/categories" },
    { label: "Tags", href: "/tags" },
    { label: "Personal", href: "/personal" },
    { label: "About", href: "/about" },
  ],
  footerLinks: [
    { label: "RSS feed", href: "/rss.xml" },
    { label: "Search", href: "/search" },
  ],
  homeSections: [
    { id: "latest", enabled: true, title: "The latest", href: "/blog", linkLabel: "All posts" },
    { id: "newsletter", enabled: true, title: "Newsletter" },
  ],
};


const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function safeLink(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const link = value.trim().slice(0, 500);
  if (!link || link.startsWith("//")) return fallback;
  if (link.startsWith("/") || link.startsWith("#")) return link;
  if (/^(https?:\/\/|mailto:)/i.test(link)) return link;
  return fallback;
}

function safeText(value: unknown, fallback: string, max = 500): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function safeList<T>(value: unknown, fallback: T[], map: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return fallback;
  const out = value.map(map).filter((item): item is T => item !== null).slice(0, 20);
  return out.length ? out : fallback;
}

function normaliseSettings(raw: SiteSettings, base: SiteSettings): SiteSettings {
  const identity = (raw.identity ?? {}) as SiteSettings["identity"];
  const hero = raw.hero as SiteSettings["hero"] & { heading?: string; subheading?: string };
  const toggles = (raw.toggles ?? {}) as SiteSettings["toggles"];
  return {
    identity: {
      wordmark: safeText(identity.wordmark, base.identity.wordmark, 80),
      siteName: safeText(identity.siteName, base.identity.siteName, 120),
      tagline: safeText(identity.tagline, base.identity.tagline, 300),
      email: safeText(identity.email, base.identity.email, 200),
      location: safeText(identity.location, base.identity.location, 120),
      avatarUrl: safeLink(identity.avatarUrl, base.identity.avatarUrl),
    },
    hero: {
      title: safeText(hero.title ?? hero.heading, base.hero.title, 160),
      standfirst: safeText(hero.standfirst ?? hero.subheading, base.hero.standfirst, 400),
    },
    socials: safeList(raw.socials, base.socials, (item) => {
      if (!item || typeof item !== "object") return null;
      const social = item as Record<string, unknown>;
      const label = safeText(social.label, "", 60);
      const href = safeLink(social.href, "");
      return label && href ? { label, href } : null;
    }),
    toggles: {
      newsletter: typeof toggles.newsletter === "boolean" ? toggles.newsletter : base.toggles.newsletter,
      comments: typeof toggles.comments === "boolean" ? toggles.comments : base.toggles.comments,
      views: typeof toggles.views === "boolean" ? toggles.views : base.toggles.views,
      contactForm: typeof toggles.contactForm === "boolean" ? toggles.contactForm : base.toggles.contactForm,
    },
    nav: safeList(raw.nav, base.nav, (item) => {
      if (!item || typeof item !== "object") return null;
      const link = item as Record<string, unknown>;
      const label = safeText(link.label, "", 60);
      const href = safeLink(link.href, "");
      return label && href ? { label, href } : null;
    }),
    footerLinks: safeList(raw.footerLinks, base.footerLinks, (item) => {
      if (!item || typeof item !== "object") return null;
      const link = item as Record<string, unknown>;
      const label = safeText(link.label, "", 60);
      const href = safeLink(link.href, "");
      return label && href ? { label, href } : null;
    }),
    homeSections: safeList(raw.homeSections, base.homeSections, (item) => {
      if (!item || typeof item !== "object") return null;
      const section = item as Record<string, unknown>;
      const id = safeText(section.id, "", 60);
      if (!id) return null;
      return {
        id,
        enabled: section.enabled !== false,
        title: safeText(section.title, id, 160),
        href: section.href === undefined ? undefined : safeLink(section.href, ""),
        linkLabel: section.linkLabel === undefined ? undefined : safeText(section.linkLabel, "", 80),
      };
    }),
  };
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch == null) return base;
  if (Array.isArray(patch) || typeof patch !== "object" || typeof base !== "object") return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (BLOCKED_KEYS.has(key)) continue;
    const current = (base as Record<string, unknown>)[key];
    out[key] = current === undefined ? value : deepMerge(current, value);
  }
  return out as T;
}

export const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!hasSupabase()) return DEFAULT_SETTINGS;
    try {
      const { data, error } = await db.from("fn_settings").select("payload").eq("id", 1).single();
      if (error || !data) return DEFAULT_SETTINGS;
      return normaliseSettings(deepMerge(DEFAULT_SETTINGS, data.payload), DEFAULT_SETTINGS);
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  ["fn-settings"],
  { revalidate: 60, tags: ["settings"] },
);
