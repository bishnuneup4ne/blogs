import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { normalizeBlocks } from "@/lib/sanitize-rich";
import { getSettings } from "@/lib/settings";
import { posts as filePosts } from "@/content/posts";
import { albums as fileAlbums } from "@/content/gallery";
import { categories as fileCategories, getCategory } from "@/lib/categories";
import { rankRelated, type ScoredPost } from "@/lib/recommend";
import type { Album, Block, Category, GalleryPhoto, Heading, Post, Series } from "@/lib/types";

export type PostStatus = "draft" | "review" | "scheduled" | "published";

export interface Topic extends Category {
  count: number;
}

interface DbPostRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: PostStatus;
  topic_slug: string | null;
  author_id: string | null;
  tags: string[] | null;
  cover_url: string | null;
  cover_alt: string | null;
  date: string;
  reading_minutes: number;
  blocks: unknown;
  featured: boolean | null;
}

interface DbAuthorRow {
  id: string;
  name: string;
  role: string;
  avatar_url: string;
}

function mapPost(row: DbPostRow, authorName = "Bishnu Neupane"): Post {
  const author = null as null | { name?: string; role?: string };
  return {
    slug: row.slug,
    title: row.title,
    description: row.summary,
    date: String(row.date).slice(0, 10),
    readingMinutes: row.reading_minutes,
    category: (row.topic_slug ?? "engineering") as Post["category"],
    tags: row.tags ?? [],
    cover: row.cover_url ? { src: row.cover_url, alt: row.cover_alt ?? "" } : undefined,
    featured: Boolean(row.featured),
    author: { name: author?.name || authorName, role: author?.role ?? "", avatar: "/avatar.jpg" },
    blocks: normalizeBlocks(row.blocks),
  };
}

async function loadDb(): Promise<{ posts: Post[]; topics: Category[]; albums: Album[]; series: Series[] } | null> {
  if (!hasSupabase()) return null;
  const authorName = (await getSettings()).identity.authorName;
  try {
    const [postsRes, topicsRes, albumsRes, photosRes, seriesRes, seriesLinksRes] = await Promise.all([
      db.from("fn_posts").select("*").eq("status", "published").order("date", { ascending: false }),
      db.from("fn_topics").select("*").order("sort_order"),
      db.from("fn_albums").select("*").order("sort_order", { ascending: false }),
      db.from("fn_photos").select("*").order("position"),
      db.from("fn_series").select("*").eq("status", "live").order("created_at"),
      db.from("fn_series_posts").select("series_id, post_id, position").order("position"),
    ]);
    if (postsRes.error || topicsRes.error || albumsRes.error) throw postsRes.error ?? topicsRes.error ?? albumsRes.error;
    const published = (postsRes.data ?? []) as DbPostRow[];
    // Empty DB means empty site — never fall back to the bundled demo posts.
    if (published.length === 0) return { posts: [], topics: [], albums: [], series: [] };
    const posts = published.map((r) => mapPost(r, authorName));
    const topics: Category[] = (topicsRes.data ?? []).map((t: any) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      color: t.color,
      pastel: t.pastel,
    }));
    const photoRows = (photosRes.data ?? []) as any[];
    const albums: Album[] = ((albumsRes.data ?? []) as any[]).map((a) => {
      const photos: GalleryPhoto[] = photoRows
        .filter((p) => p.album_id === a.id)
        .map((p) => ({
          id: p.id,
          src: p.src,
          alt: p.alt,
          caption: p.caption,
          width: p.width,
          height: p.height,
          takenAt: p.taken_at ? String(p.taken_at).slice(0, 10) : "",
          camera: p.camera || undefined,
          kind: p.kind === "video" ? ("video" as const) : ("image" as const),
          poster: p.poster_url || undefined,
        }));
      return {
        slug: a.slug,
        title: a.title,
        subtitle: a.subtitle,
        description: a.description,
        year: a.year,
        cover: a.cover_url || photos.find((ph) => ph.kind === "image")?.src || "",
        photos,
      };
    });
    const postRefs = new Map(published.map((row) => [row.id, { slug: row.slug, title: row.title }]));
    const links = seriesRes.error ? [] : (seriesLinksRes.data ?? []) as { series_id: string; post_id: string; position: number }[];
    const series: Series[] = seriesRes.error
      ? []
      : ((seriesRes.data ?? []) as { id: string; slug: string; title: string; description: string }[])
          .map((row) => ({
            slug: row.slug,
            title: row.title,
            description: row.description,
            posts: links
              .filter((link) => link.series_id === row.id && postRefs.has(link.post_id))
              .map((link) => postRefs.get(link.post_id)!)
              .filter((ref, index, all) => all.findIndex((item) => item.slug === ref.slug) === index),
          }))
          .filter((row) => row.posts.length > 0);
    return { posts, topics, albums, series };
  } catch {
    return null;
  }
}

function fileData() {
  const sorted = [...filePosts].sort((a, b) => (a.date < b.date ? 1 : -1));
  return { posts: sorted, topics: fileCategories, albums: [...fileAlbums].sort((a, b) => b.year - a.year), series: [] as Series[] };
}

/** Cached snapshot of all DB content (or files when DB is unavailable/unseeded). */
export const getContent = unstable_cache(
  async () => (await loadDb()) ?? fileData(),
  ["fn-content-v3"],
  { revalidate: 60, tags: ["content"] },
);

export async function getAllPosts(): Promise<Post[]> {
  return (await getContent()).posts;
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getAllPosts()).find((p) => p.slug === slug);
}

/** Minimal published-post list for callers that only need identity fields. */
export async function getAllPostSummaries(): Promise<Pick<Post, "slug" | "title" | "date" | "category">[]> {
  return (await getAllPosts()).map(({ slug, title, date, category }) => ({ slug, title, date, category }));
}

export async function getRelatedPostsDetailed(post: Post, limit = 6): Promise<ScoredPost[]> {
  const sorted = await getAllPosts();
  return rankRelated(post, sorted, limit);
}

export async function getPostsByCategory(slug: string): Promise<Post[]> {
  return (await getAllPosts()).filter((p) => p.category === slug);
}

export async function allTopics(): Promise<Topic[]> {
  const { posts, topics } = await getContent();
  const counts: Record<string, number> = {};
  for (const p of posts) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return topics.map((c) => ({ ...c, count: counts[c.slug] ?? 0 }));
}

export { getCategory };

export function getHeadings(blocks: Block[]): Heading[] {
  const headings: Heading[] = [];
  for (const block of blocks) {
    if (block.type === "h2" || block.type === "h3") {
      headings.push({ id: block.id, text: block.text, level: block.type === "h2" ? 2 : 3 });
    }
  }
  return headings;
}

export { formatDate, relativeDate } from "@/lib/dates";

export interface TagSummary {
  slug: string;
  name: string;
  count: number;
}

export async function allTags(): Promise<TagSummary[]> {
  const map = new Map<string, number>();
  for (const post of await getAllPosts()) {
    for (const tag of post.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ slug: slugify(name), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tagSlug(name: string): string {
  return slugify(name);
}

export async function getPostsByTag(slug: string): Promise<Post[]> {
  return (await getAllPosts()).filter((p) => p.tags.some((t) => slugify(t) === slug));
}

export async function getTagName(slug: string): Promise<string | undefined> {
  return (await allTags()).find((t) => t.slug === slug)?.name;
}

export async function getAllSeries(): Promise<Series[]> {
  return (await getContent()).series;
}

export async function getSeries(slug: string): Promise<Series | undefined> {
  return (await getAllSeries()).find((series) => series.slug === slug);
}


export async function getAlbums(): Promise<Album[]> {
  return (await getContent()).albums;
}

export async function getAlbum(slug: string): Promise<Album | undefined> {
  return (await getAlbums()).find((a) => a.slug === slug);
}

export async function revalidateContentCache() {
  const nextCache = await import("next/cache");
  nextCache.revalidateTag("content", {});
  nextCache.revalidateTag("settings", {});
  nextCache.revalidatePath("/", "layout");
  nextCache.revalidatePath("/sitemap.xml");
  nextCache.revalidatePath("/rss.xml");
}

/** Alias kept so pages can import a familiar name. */
export { allTopics as allCategories };
