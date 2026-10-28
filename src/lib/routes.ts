import { site } from "./site";

/* Every internal destination in one place, so a path change is a one-line
   edit and nothing hardcodes "/blog/..." across pages. `url()` builds an
   absolute link from the configured site origin — used for share targets
   and metadata, which must be absolute. */

export const routes = {
  home: "/",
  blog: "/blog",
  topics: "/topics",
  tags: "/tags",
  personal: "/personal",
  personalBlogs: "/personal/blogs",
  about: "/about",
  resources: "/resources",
  gallery: "/gallery",
  newsletter: "/newsletter",
  search: "/search",
  privacy: "/privacy",

  post: (slug: string) => `/blog/${slug}`,
  category: (slug: string) => `/blog/category/${slug}`,
  tag: (slug: string) => `/blog/tag/${slug}`,
  album: (slug: string) => `/gallery/${slug}`,
  series: (slug: string) => `/series/${slug}`,
} as const;

/** Absolute URL for a route path, built from the configured site origin. */
export function url(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
