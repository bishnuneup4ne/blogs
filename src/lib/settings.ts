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

export interface AboutEntry {
  label?: string;
  value?: string;
  year?: string;
  title?: string;
  body?: string;
}

export interface SiteSettings {
  identity: {
    wordmark: string;
    siteName: string;
    tagline: string;
    email: string;
    location: string;
    avatarUrl: string;
    authorName: string;
  };
  hero: { title: string; standfirst: string };
  socials: { label: string; href: string; icon?: string }[];
  toggles: { newsletter: boolean; comments: boolean; views: boolean; contactForm: boolean };
  nav: { label: string; href: string; icon?: string }[];
  footerLinks: { label: string; href: string; icon?: string }[];
  homeSections: HomeSection[];
  about: {
    kicker: string;
    title: string;
    lede: string;
    quote: string;
    focus: string[];
    story: string[];
    now: AboutEntry[];
    timeline: AboutEntry[];
    updated: string;
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  identity: {
    wordmark: "bishnuneup4ne",
    siteName: "bishnuneup4ne — Security Newsroom",
    tagline: "Security, systems and the life around them.",
    email: "contact@bishnuneupane13.com.np",
    location: "Kathmandu, Nepal",
    avatarUrl: "/avatar.jpg",
    authorName: "Bishnu Neupane",
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
  about: {
    kicker: "About",
    title: "Cybersecurity enthusiast. Low-level hacker. Compulsive note-taker.",
    lede: "I'm Bishnu, 18, from Kathmandu, Nepal. I spend most of my time around cybersecurity — reverse engineering binaries, studying malware, penetration testing web applications, and going one layer below the abstraction. I also build with AI in the loop, using it to prototype tools and move faster without switching off my brain. I study Computer Engineering (BE CE) at NCIT College, Nepal, and this site is where the breaking, building and documenting meet.",
    quote: "The best way to understand a system is to break it, read the pieces, and write down what you learned.",
    focus: ["Malware analysis", "Reverse engineering", "Penetration testing", "Low-level systems", "AI-assisted development"],
    story: [
      "I'm a cybersecurity enthusiast with a bad habit of asking what sits underneath the abstraction. Malware, reverse engineering, penetration testing, low-level systems — the work changes, but the method is the same: take the thing apart, find the assumptions holding it together, and document the path back.",
      "AI-assisted software development sits on the other side of that loop. I use it to build tools, prototypes and small pieces of infrastructure, then verify the output like any other untrusted input. Most posts here are work notes — reverse-engineering logs, penetration-testing findings, malware notes, tooling experiments, and the occasional detour into college, books and the trail.",
    ],
    now: [
      { label: "Studying", value: "BE Computer Engineering at NCIT College, Nepal" },
      { label: "Building", value: "Security tooling and AI-assisted prototypes" },
      { label: "Hunting", value: "Bug bounties — web apps, auth flows and access control" },
      { label: "Learning", value: "Reverse engineering, malware analysis and exploit development" },
    ],
    timeline: [
      { year: "2024", title: "Class 10", body: "Finished class 10 with a 3.73 GPA." },
      { year: "2024", title: "First lines of code", body: "Touched code for the first time. Wrote things that worked, then learned to break them properly." },
      { year: "2025", title: "AI-assisted building", body: "Began shipping full-stack web and software projects with AI in the loop — building fast, reviewing harder, trusting nothing blindly." },
      { year: "2025", title: "Bug hunting", body: "Started bug bounty hunting full-throttle: web apps, auth flows, the usual suspects. Reports became my favourite kind of homework." },
      { year: "2026", title: "Class 12 & college", body: "Finished class 12 with a 3.78 GPA — then straight into the BE Computer Engineering program at NCIT, Kathmandu." },
      { year: "2026", title: "Low-level, seriously", body: "Reverse engineering, malware analysis and assembly — going one layer below the abstraction and writing up everything I find." },
    ],
    updated: "October 2026",
  },
};


const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const KNOWN_SOCIAL_ICONS = new Set([
  "github", "linkedin", "x", "instagram", "youtube", "facebook", "threads", "email",
]);

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
      authorName: safeText(identity.authorName, base.identity.authorName, 120),
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
      const icon = typeof social.icon === "string" && KNOWN_SOCIAL_ICONS.has(social.icon) ? social.icon : undefined;
      return label && href ? { label, href, icon } : null;
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
    about: (() => {
      const a = (raw.about ?? {}) as Partial<SiteSettings["about"]>;
      const b = base.about;
      const textArr = (v: unknown, fb: string[]) =>
        Array.isArray(v) && v.length ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 2000)).slice(0, 20) : fb;
      const entryArr = (v: unknown, fb: AboutEntry[]) =>
        Array.isArray(v) && v.length
          ? (v as Record<string, unknown>[]).map((e) => ({
              label: safeText(e.label, "", 60),
              value: safeText(e.value, "", 300),
              year: safeText(e.year, "", 10),
              title: safeText(e.title, "", 160),
              body: safeText(e.body, "", 600),
            })).slice(0, 30)
          : fb;
      return {
        kicker: safeText(a.kicker, b.kicker, 60),
        title: safeText(a.title, b.title, 200),
        lede: safeText(a.lede, b.lede, 1500),
        quote: safeText(a.quote, b.quote, 500),
        focus: textArr(a.focus, b.focus),
        story: textArr(a.story, b.story),
        now: entryArr(a.now, b.now),
        timeline: entryArr(a.timeline, b.timeline),
        updated: safeText(a.updated, b.updated, 60),
      };
    })(),
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
  ["fn-settings-v2"],
  { revalidate: 60, tags: ["settings"] },
);
