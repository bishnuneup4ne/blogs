// The blog lives on its own subdomain; the apex domain is the portfolio.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://blogs.bishnuneupane13.com.np").replace(/\/+$/, "");

export const site = {
  name: "Bishnu Neupane",
  title: "Notes from Bishnu — security, systems and life",
  description:
    "A personal blog and rolling archive: security engineering, systems, field notes, the trail and the things that keep a life interesting.",
  url: siteUrl,
} as const;
