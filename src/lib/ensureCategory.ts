import type { SupabaseClient } from "@supabase/supabase-js";
import { toSlug } from "@/lib/slug";

/** Ensures a nav category row exists when a writeup uses that category name. */
export async function ensureCategoryExists(
  client: SupabaseClient,
  categoryName: string | null | undefined,
): Promise<void> {
  const name = categoryName?.trim();
  if (!name) return;

  const slug = toSlug(name);
  if (!slug) return;

  const { data: existing } = await client.from("categories").select("id").eq("name", name).maybeSingle();

  if (existing) return;

  const { data: maxRow } = await client
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await client.from("categories").insert({
    name,
    slug,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });
}
