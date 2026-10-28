import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { normalizeBlocks } from "@/lib/sanitize-rich";
import { getSettings } from "@/lib/settings";
import { posts as filePosts } from "@/content/posts";
import { albums as fileAlbums } from "@/content/gallery";
import { series as fileSeries } from "@/content/series";
import { categories as fileCategories, getCategory } from "@/lib/categories";
import { rankRelated, type ScoredPost } from "@/lib/recommend";
import type { Album, Block, Category, CategorySlug, GalleryPhoto, Heading, Post, Series } from "@/lib/types";

export type PostStatus = "draft" | "review" | "scheduled" | "published";

/* Older schemas have no cover_height/cover_focal columns, so the editor packs
   both into cover_alt as `[[cover:h=560;f=30]]`. Strip that tag for display. */
const COVER_META = /\[\[cover:h=(\d+);f=(\d+)\]\]/;

function parseCover(src: string, rawAlt: string | null, columnHeight: number, columnFocal?: number | null) {
  const alt = rawAlt ?? "";
  const match = alt.match(COVER_META);
  // h=0 is the editor's "Auto" state — treat it as no explicit height.
  const packed = Number(match?.[1]) || 0;
  const height = packed > 0 ? packed : columnHeight > 0 ? columnHeight : undefined;
  // Prefer the dedicated column; fall back to the packed tag for older rows.
  const focal = columnFocal != null ? columnFocal : match ? Number(match[2]) : undefined;
  return { src, alt: alt.replace(COVER_META, "").trim(), height, focal };
}

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
  cover_height?: number | null;
  cover_focal?: number | null;
  date: string;
  reading_minutes: number;
  blocks: unknown;
  featured: boolean | null;
}

interface DbAuthorRow {
  id: string;  name: string;
  role: string;
  avatar_url: string;
}

const DEFAULT_AUTHOR = { name: "Bishnu Neupane", role: "", avatar: "/avatar.jpg" };

async function loadAuthors(): Promise<Map<string, { name: string; role: string; avatar: string }>> {
  if (!hasSupabase()) {
    // Fallback: return a default single-author map.
    return new Map([["default", DEFAULT_AUTHOR]]);
  }
  try {
    // Older installs have no fn_authors.status column, so don't filter on it;
    // ordering keeps a stable pick when several authors exist.
    const { data: authors, error } = await db
      .from("fn_authors")
      .select("id, name, role, avatar_url")
      .order("sort_order");
    if (error) throw error;
    const authorMap = new Map<string, { name: string; role: string; avatar: string }>();
    ;(authors ?? []).forEach((a: any) => {
      authorMap.set(a.id, {
        name: a.name,
        role: a.role || "",
        avatar: a.avatar_url || "/avatar.jpg",
      });
    });
    return authorMap;
  } catch {
    return new Map([["default", DEFAULT_AUTHOR]]);
  }
}

function mapPost(row: DbPostRow, authorMap: Map<string, { name: string; role: string; avatar: string }>): Post {
  const blocks = normalizeBlocks(row.blocks);
  // Word count feeds the reading-time fallback when no stored value exists.
  const words = blocks
    .map((b) => ("html" in b ? b.html : "text" in b ? b.text : "code" in b ? b.code : "items" in b ? b.items.join(" ") : ""))
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  const authorId = row.author_id ?? "default";
  // A post with no author_id (or an author since deleted) falls back to the
  // site's first author, then a synthetic byline — never undefined.
  const author = authorMap.get(authorId) || authorMap.values().next().value || DEFAULT_AUTHOR;
  return {
    slug: row.slug,
    title: row.title,
    description: row.summary,
    date: String(row.date).slice(0, 10),
    readingMinutes: row.reading_minutes > 0 ? row.reading_minutes : Math.max(1, Math.round(words / 220)),
    category: (row.topic_slug ?? "engineering") as Post["category"],
    tags: row.tags ?? [],
    cover: row.cover_url ? parseCover(row.cover_url, row.cover_alt, Number(row.cover_height ?? 0), row.cover_focal) : undefined,
    featured: Boolean(row.featured),
    author: { name: author.name, role: author.role, avatar: author.avatar },
    blocks,
  };
}

async function loadSeries(published: { id: string; slug: string; title: string; cover_url?: string | null }[]): Promise<Series[]> {
  try {
    const [{ data: seriesRows }, { data: linkRows }] = await Promise.all([
      db.from("fn_series").select("*").eq("status", "live"),
      db.from("fn_series_posts").select("series_id, post_id, position").order("position"),
    ]);
    if (!seriesRows?.length) return [];
    const byPost = new Map(published.map((p) => [p.id, p]));
    return seriesRows
      .map((s: any) => {
        const posts = (linkRows ?? [])
          .filter((l: any) => l.series_id === s.id && byPost.has(l.post_id))
          .map((l: any) => ({ slug: byPost.get(l.post_id)!.slug, title: byPost.get(l.post_id)!.title }));
        const ownCover = typeof s.cover_url === "string" && s.cover_url ? s.cover_url : undefined;
        // No explicit cover yet? Lead with the first part's own cover photo.
        const first = posts.length ? published.find((p) => p.slug === posts[0].slug) : undefined;
        return {
          slug: s.slug,
          title: s.title,
          description: s.description ?? "",
          cover: ownCover ?? first?.cover_url ?? undefined,
          posts,
        };
      })
      // A live series whose posts are all unpublished must not render an empty page.
      .filter((s) => s.posts.length > 0);
  } catch {
    return [];
  }
}

async function loadDb(): Promise<{ posts: Post[]; topics: Category[]; albums: Album[]; series: Series[] } | null> {
  if (!hasSupabase()) return null;
  try {
    const [postsRes, topicsRes, albumsRes, photosRes] = await Promise.all([
      db.from("fn_posts").select("*").eq("status", "published").order("date", { ascending: false }),
      db.from("fn_topics").select("*").order("sort_order"),
      db.from("fn_albums").select("*").order("sort_order", { ascending: false }),
      db.from("fn_photos").select("*").order("position"),
    ]);
    if (postsRes.error || topicsRes.error || albumsRes.error) throw postsRes.error ?? topicsRes.error ?? albumsRes.error;
    const published = (postsRes.data ?? []) as DbPostRow[];
    // Empty DB means empty site — never fall back to the bundled demo posts.
    if (published.length === 0) return { posts: [], topics: [], albums: [], series: [] };
    const authorMap = await loadAuthors();
    const posts = published.map((r) => mapPost(r, authorMap));
    const series = await loadSeries(
      published.map((r) => ({ id: r.id, slug: r.slug, title: r.title, cover_url: (r as any).cover_url ?? null })),
    );
    const topics: Category[] = (topicsRes.data ?? []).map((t: any) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      color: t.color,
      pastel: t.pastel,
      image: typeof t.image_url === "string" && t.image_url ? t.image_url : undefined,
      shape: typeof t.shape === "string" && t.shape ? t.shape : undefined,
      sort_order: Number(t.sort_order ?? 0),
    }));
    const photoRows = (photosRes.data ?? []) as any[];
    // Group once: the previous filter-per-album was O(albums × photos).
    const photosByAlbum = new Map<string, any[]>();
    for (const p of photoRows) {
      const list = photosByAlbum.get(p.album_id);
      if (list) list.push(p);
      else photosByAlbum.set(p.album_id, [p]);
    }
    const albums: Album[] = ((albumsRes.data ?? []) as any[]).map((a) => {
      const photos: GalleryPhoto[] = (photosByAlbum.get(a.id) ?? [])
        .map((p: any) => ({
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
    return { posts, topics, albums, series };
  } catch {
    return null;
  }
}

function fileData() {
  const sorted = [...filePosts].sort((a, b) => (a.date < b.date ? 1 : -1));
  return { posts: sorted, topics: fileCategories, albums: [...fileAlbums].sort((a, b) => b.year - a.year), series: fileSeries };
}

/** Cached snapshot of all DB content.
    The bundled demo posts are only a fallback for a site with no Supabase
    configured at all — on a DB outage we serve empty content rather than
    silently publishing demo stories over a live site. */
export const getContent = unstable_cache(
  async () => {
    const live = await loadDb();
    if (live) return live;
    return hasSupabase() ? { posts: [], topics: [], albums: [], series: [] } : fileData();
  },
  ["fn-content-v4"],
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

export async function getRelatedPostsDetailed(post: Post, limit = 12): Promise<ScoredPost[]> {
  const [sorted, series] = await Promise.all([getAllPosts(), getAllSeries()]);
  return rankRelated(post, sorted, limit, { series });
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

/* DB topics override the bundled defaults; unknown slugs fall back to the
   generic "uncategorised" category, so never plain getCategory() on its own. */
export async function getTopicCategory(slug: string): Promise<Category> {
  const topics = await allTopics();
  return topics.find((t) => t.slug === slug) ?? getCategory(slug as CategorySlug);
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

;

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
  const slugs = new Set((await getAllPosts()).map((p) => p.slug));
  return (await getContent()).series.filter((s) => s.posts.every((p) => slugs.has(p.slug)));
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
