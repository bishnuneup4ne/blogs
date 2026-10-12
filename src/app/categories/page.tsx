import { getCategoriesWithCounts } from "@/lib/categories";
import { getSiteConfig } from "@/lib/config";
import { CategoryList } from "@/components/categories/CategoryList";
import { PageShell, PageHeader } from "@/components/ui";

export const revalidate = 60;

export async function generateMetadata() {
  const config = await getSiteConfig();
  return {
    title: `Categories – ${config.person.name}`,
    description: "Browse writeups by category",
  };
}

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <PageShell width="medium">
      <PageHeader
        title="Categories"
        meta={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} — tap to view posts`}
      />

      {categories.length === 0 ? (
        <p>No categories yet. Add them in Admin → Categories.</p>
      ) : (
        <CategoryList categories={categories} />
      )}
    </PageShell>
  );
}
