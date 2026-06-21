import { unstable_cache } from "next/cache";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";
import { toSlug } from "@/lib/slug";

export type NavCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

async function fetchCategoriesFromWriteups(): Promise<NavCategory[]> {
  const { data, error } = await supabase
    .from("writeups")
    .select("category")
    .eq("is_deleted", false)
    .eq("status", "Published");

  if (error || !data) return [];

  const names = Array.from(
    new Set(
      data
        .map((row) => row.category?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return names.map((name, index) => ({
    id: `writeup-${toSlug(name)}`,
    name,
    slug: toSlug(name),
    sort_order: index,
  }));
}

async function fetchNavCategories(): Promise<NavCategory[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data?.length) {
      return data as NavCategory[];
    }

    if (error) {
      console.warn("[categories] table query failed, using writeup categories:", error.message);
    }

    return fetchCategoriesFromWriteups();
  } catch {
    return fetchCategoriesFromWriteups();
  }
}

const getCachedNavCategories = unstable_cache(
  fetchNavCategories,
  ["nav-categories"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["nav-categories"] },
);

/** Admin-defined navbar categories; falls back to published writeup categories. */
export const getNavCategories = cache(getCachedNavCategories);

export async function getCategoryBySlug(slug: string): Promise<NavCategory | null> {
  const categories = await getNavCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export type CategoryWithCount = NavCategory & { count: number };

/** Plain object — unstable_cache cannot serialize Map */
async function fetchCategoryPostCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("writeups")
    .select("category")
    .eq("is_deleted", false)
    .eq("status", "Published");

  const counts: Record<string, number> = {};
  if (error || !data) return counts;

  for (const row of data) {
    const name = row.category?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const getCachedCategoryCounts = unstable_cache(
  fetchCategoryPostCounts,
  ["category-post-counts"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["nav-categories", "writeups"] },
);

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const [categories, counts] = await Promise.all([
    getNavCategories(),
    getCachedCategoryCounts(),
  ]);
  return categories.map((cat) => ({
    ...cat,
    count: counts[cat.name.toLowerCase()] ?? 0,
  }));
}

/** @deprecated Use getNavCategories — kept for API compatibility. */
export async function getBlogCategories(): Promise<string[]> {
  const categories = await getNavCategories();
  return categories.map((c) => c.name);
}
