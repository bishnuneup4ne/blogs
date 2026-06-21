import { unstable_cache } from "next/cache";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { getPosts as getLocalPosts } from "./utils";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";

const LIST_COLUMNS =
  "slug, title, summary, date, created_at, featured_image_url, images, technologies, live_url, github_url";

type ProjectRow = Record<string, unknown> & {
  slug: string;
  title: string;
  created_at: string;
  content?: string;
};

function mapProject(row: ProjectRow, includeContent = false) {
  const images = row.images
    ? Array.isArray(row.images)
      ? (row.images as string[])
      : [row.images as string]
    : [];
  const featured = (row.featured_image_url as string) || "";
  const allImages =
    featured && !images.includes(featured)
      ? [featured, ...images]
      : images.length
        ? images
        : featured
          ? [featured]
          : [];

  return {
    slug: row.slug,
    metadata: {
      title: (row.title as string) || "",
      publishedAt:
        (row.date as string) ||
        new Date(row.created_at).toISOString().split("T")[0],
      summary: (row.summary as string) || "",
      image: featured,
      images: allImages,
      tag:
        row.technologies && (row.technologies as string[]).length > 0
          ? (row.technologies as string[])[0]
          : "",
      team: [],
      link: (row.live_url as string) || (row.github_url as string) || "",
    },
    content: includeContent ? (row.content as string) || "" : "",
  };
}

async function fetchPublishedProjects(includeContent: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return getLocalPosts(["src", "app", "work", "projects"]);
  }

  try {
    const { data, error } = includeContent
      ? await supabase
          .from("projects")
          .select(`${LIST_COLUMNS}, content`)
          .eq("is_deleted", false)
          .eq("status", "Published")
          .order("created_at", { ascending: false })
      : await supabase
          .from("projects")
          .select(LIST_COLUMNS)
          .eq("is_deleted", false)
          .eq("status", "Published")
          .order("created_at", { ascending: false });

    if (error || !data?.length) {
      return getLocalPosts(["src", "app", "work", "projects"]);
    }

    return (data as unknown as ProjectRow[]).map((row) => mapProject(row, includeContent));
  } catch {
    return getLocalPosts(["src", "app", "work", "projects"]);
  }
}

const getCachedProjectList = unstable_cache(
  () => fetchPublishedProjects(false),
  ["projects-list"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["projects"] },
);

export const getSupabaseProjects = cache(getCachedProjectList);

async function fetchProjectBySlug(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return getLocalPosts(["src", "app", "work", "projects"]).find((p) => p.slug === slug) || null;
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .select(`${LIST_COLUMNS}, content`)
      .eq("slug", slug)
      .eq("is_deleted", false)
      .eq("status", "Published")
      .single();

    if (error || !data) {
      return getLocalPosts(["src", "app", "work", "projects"]).find((p) => p.slug === slug) || null;
    }

    return mapProject(data as ProjectRow, true);
  } catch {
    return getLocalPosts(["src", "app", "work", "projects"]).find((p) => p.slug === slug) || null;
  }
}

export const getSupabaseProjectBySlug = cache(async (slug: string) => {
  return unstable_cache(
    () => fetchProjectBySlug(slug),
    ["project", slug],
    { revalidate: DATA_REVALIDATE_SECONDS, tags: ["projects", `project-${slug}`] },
  )();
});
