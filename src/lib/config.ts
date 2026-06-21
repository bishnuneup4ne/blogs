import { unstable_cache } from "next/cache";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { Person, Social, Newsletter, Home, About, Blog, Work, Gallery } from "@/types";
import type { ReactNode } from "react";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";

/** Coerce DB/JSON values to plain text — avoids React #62 when objects are rendered as children. */
function toTextNode(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value == null || typeof value === "boolean") return fallback;
  return fallback;
}

function toReactNode(value: unknown, fallback: ReactNode): ReactNode {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value == null || typeof value === "object" || typeof value === "boolean") {
    return typeof fallback === "string" ? fallback : toTextNode(fallback, "");
  }
  return value as ReactNode;
}

export function normalizeSiteConfig(config: typeof defaultConfig) {
  const homeDefault = defaultConfig.home;
  return {
    ...config,
    newsletter: {
      ...config.newsletter,
      description: toReactNode(
        config.newsletter.description,
        defaultConfig.newsletter.description,
      ),
    },
    home: {
      ...config.home,
      headline: toReactNode(config.home.headline, homeDefault.headline),
      subline: toReactNode(config.home.subline, homeDefault.subline),
      featured: {
        ...config.home.featured,
        title: toReactNode(config.home.featured?.title, homeDefault.featured.title),
      },
    },
  };
}

// Default fallback configuration in case database fetch fails or is empty
export const defaultConfig = {
  person: {
    firstName: "YNUBSEC",
    lastName: "",
    name: "YNUBSEC",
    role: "Security Newsroom",
    avatar: "/images/ynubsec/logo-primary.png",
    email: "contact@ynubsec.com",
    location: "Asia/Kathmandu",
    languages: ["English"],
  } as Person,
  newsletter: {
    display: true,
    title: "Subscribe to YNUBSEC's Newsletter",
    description: "My weekly newsletter about creativity and engineering",
  } as Newsletter,
  social: [
    {
      name: "GitHub",
      icon: "github",
      link: "https://github.com/once-ui-system",
      essential: true,
    },
    {
      name: "LinkedIn",
      icon: "linkedin",
      link: "https://www.linkedin.com/company/once-ui/",
      essential: true,
    },
    {
      name: "Threads",
      icon: "threads",
      link: "https://www.threads.com/@once_ui",
      essential: true,
    },
    {
      name: "Email",
      icon: "email",
      link: "mailto:contact@ynubsec.com",
      essential: true,
    },
  ] as Social,
  home: {
    path: "/blogs",
    image: "/images/og/home.jpg",
    label: "Home",
    title: "YNUBSEC's Portfolio",
    description: "Portfolio website showcasing my work as a Security Newsroom",
    headline: "Building bridges between design and code",
    featured: {
      display: true,
      title: "Featured work",
      href: "/work",
    },
    subline: "Independent, focused, and technical. We publish writeups, notebook entries, and practical analysis with an emphasis on clarity and depth.",
  } as Home,
  about: {
    path: "/about",
    label: "About",
    title: "About – YNUBSEC",
    description: "Meet YNUBSEC, Security Newsroom from Asia/Kathmandu",
    tableOfContent: { display: true, subItems: false },
    avatar: { display: true },
    calendar: { display: true, link: "https://cal.com" },
    intro: {
      display: true,
      title: "Introduction",
      description: "YNUBSEC Newsletter brings you professional insights into security, technology, and digital innovation.",
    },
    work: { display: true, title: "Work Experience", experiences: [] },
    studies: { display: true, title: "Studies", institutions: [] },
    technical: { display: true, title: "Technical skills", skills: [] },
  } as About,
  blog: {
    path: "/blogs",
    label: "Blog",
    title: "Writing about design and tech...",
    description: "Read what YNUBSEC has been up to recently",
  } as Blog,
  work: {
    path: "/work",
    label: "Work",
    title: "Projects – YNUBSEC",
    description: "Design and dev projects by YNUBSEC",
  } as Work,
  gallery: {
    path: "/gallery",
    label: "Gallery",
    title: "Photo gallery – YNUBSEC",
    description: "A photo collection by YNUBSEC",
    images: [],
  } as Gallery,
};

async function fetchSiteConfigFromDb() {
  try {
    const { data, error } = await supabase
      .from("site_config")
      .select("person, newsletter, social_links, home, about, blog, work, gallery")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.warn("Using default config due to error or missing data:", error?.message);
      return normalizeSiteConfig(defaultConfig);
    }

    return normalizeSiteConfig({
      person: (data.person as Person) || defaultConfig.person,
      newsletter: (data.newsletter as Newsletter) || defaultConfig.newsletter,
      social: (data.social_links as Social) || defaultConfig.social,
      home: (data.home as Home) || defaultConfig.home,
      about: (data.about as About) || defaultConfig.about,
      blog: (data.blog as Blog) || defaultConfig.blog,
      work: (data.work as Work) || defaultConfig.work,
      gallery: (data.gallery as Gallery) || defaultConfig.gallery,
    });
  } catch (error) {
    console.error("Failed to fetch site config:", error);
    return normalizeSiteConfig(defaultConfig);
  }
}

const getCachedSiteConfig = unstable_cache(
  fetchSiteConfigFromDb,
  ["site-config"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["site-config"] },
);

/** Cached site config — one Supabase round-trip per minute, deduped per request. */
export const getSiteConfig = cache(getCachedSiteConfig);
