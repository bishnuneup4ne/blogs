import { baseURL } from "@/resources";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        // /unsubscribe is a state-changing confirmation page; keeping crawlers
        // and link prefetchers off it is part of preventing accidental opt-outs.
        disallow: ["/admin", "/api/", "/unsubscribe"],
      },
    ],
    sitemap: `${baseURL}/sitemap.xml`,
  };
}
