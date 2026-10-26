import type { MetadataRoute } from "next";
import { allCategories, allTags, getAllPosts, getAllSeries, getAlbums } from "@/lib/data";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/blog", "/about", "/topics", "/tags", "/personal", "/gallery", "/newsletter", "/privacy"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const posts = (await getAllPosts()).map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    priority: 0.7,
  }));

  const categories = (await allCategories()).map((c) => ({
    url: `${site.url}/blog/category/${c.slug}`,
    priority: 0.5,
  }));

  const tags = (await allTags()).map((t) => ({
    url: `${site.url}/blog/tag/${t.slug}`,
    priority: 0.4,
  }));

  const albums = (await getAlbums()).map((a) => ({
    url: `${site.url}/gallery/${a.slug}`,
    priority: 0.5,
  }));

  const series = (await getAllSeries()).map((item) => ({
    url: `${site.url}/series/${item.slug}`,
    priority: 0.5,
  }));

  return [...staticRoutes, ...posts, ...categories, ...tags, ...albums, ...series];
}
