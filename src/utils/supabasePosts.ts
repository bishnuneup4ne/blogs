import { unstable_cache } from "next/cache";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { getPosts as getLocalPosts } from "./utils";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";

const LIST_COLUMNS =
  "slug, title, category, summary, date, created_at, featured_image_url, image_url, images, tags, video_url";

type WriteupRow = {
  slug: string;
  title: string;
  category?: string;
  summary?: string;
  date?: string;
  created_at: string;
  featured_image_url?: string;
  image_url?: string;
  images?: string[] | string;
  tags?: string[];
  video_url?: string;
  content?: string;
};

function mapWriteupToPost(w: WriteupRow, includeContent = false) {
  return {
    slug: w.slug,
    metadata: {
      title: w.title,
      subtitle: w.category || "",
      publishedAt: w.date || new Date(w.created_at).toISOString().split("T")[0],
      summary: w.summary || "",
      image: w.featured_image_url || w.image_url || "",
      images: w.images ? (Array.isArray(w.images) ? w.images : [w.images]) : [],
      tag: w.tags && w.tags.length > 0 ? w.tags[0] : "",
      tags: w.tags && w.tags.length > 0 ? w.tags : [],
      category: w.category || "",
      video_url: w.video_url || "",
      team: [],
      link: "",
    },
    content: includeContent ? w.content || "" : "",
  };
}

async function fetchPublishedWriteups(includeContent: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return getLocalPosts(["src", "app", "blog", "posts"]);
  }

  try {
    const { data, error } = includeContent
      ? await supabase
          .from("writeups")
          .select(`${LIST_COLUMNS}, content`)
          .eq("is_deleted", false)
          .eq("status", "Published")
          .order("created_at", { ascending: false })
      : await supabase
          .from("writeups")
          .select(LIST_COLUMNS)
          .eq("is_deleted", false)
          .eq("status", "Published")
          .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching writeups from Supabase:", error);
      return getLocalPosts(["src", "app", "blog", "posts"]);
    }

    if (!data?.length) {
      return getLocalPosts(["src", "app", "blog", "posts"]);
    }

    return (data as unknown as WriteupRow[]).map((w) => mapWriteupToPost(w, includeContent));
  } catch (err) {
    console.error("Failed to fetch posts from Supabase:", err);
    return getLocalPosts(["src", "app", "blog", "posts"]);
  }
}

const getCachedPostList = unstable_cache(
  () => fetchPublishedWriteups(false),
  ["writeups-list"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["writeups"] },
);

/** List view — no post bodies (much faster). */
export const getSupabasePosts = cache(getCachedPostList);

const getCachedPostListWithContent = unstable_cache(
  () => fetchPublishedWriteups(true),
  ["writeups-list-with-content"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["writeups"] },
);

/** Includes body text (video gallery / previews). */
export const getSupabasePostsWithContent = cache(getCachedPostListWithContent);

async function fetchWriteupBySlug(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return getLocalPosts(["src", "app", "blog", "posts"]).find((p) => p.slug === slug) || null;
  }

  try {
    const { data, error } = await supabase
      .from("writeups")
      .select(`${LIST_COLUMNS}, content`)
      .eq("slug", slug)
      .eq("is_deleted", false)
      .eq("status", "Published")
      .single();

    if (error || !data) {
      return getLocalPosts(["src", "app", "blog", "posts"]).find((p) => p.slug === slug) || null;
    }

    return mapWriteupToPost(data as WriteupRow, true);
  } catch (err) {
    console.error(`Failed to fetch post by slug ${slug}:`, err);
    return getLocalPosts(["src", "app", "blog", "posts"]).find((p) => p.slug === slug) || null;
  }
}

export const getSupabasePostBySlug = cache(async (slug: string) => {
  return unstable_cache(
    () => fetchWriteupBySlug(slug),
    ["writeup", slug],
    { revalidate: DATA_REVALIDATE_SECONDS, tags: ["writeups", `writeup-${slug}`] },
  )();
});
