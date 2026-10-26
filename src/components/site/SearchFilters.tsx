import { SearchFiltersBar } from "./SearchFiltersBar";
import { allCategories } from "@/lib/data";

export async function SearchFilters({ total }: { total: number }) {
  const topics = (await allCategories()).filter((c) => c.count > 0);
  return (
    <SearchFiltersBar
      total={total}
      topics={topics.map((t) => ({ slug: t.slug, name: t.name }))}
    />
  );
}
