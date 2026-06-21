import { getCategoriesWithCounts } from "@/lib/categories";
import { getSiteConfig } from "@/lib/config";
import { CategoryList } from "@/components/categories/CategoryList";
import pageStyles from "@/styles/page-shell.module.scss";

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
    <div className={pageStyles.shell}>
      <header className={pageStyles.header}>
        <h1 className={pageStyles.title}>Categories</h1>
        <p className={pageStyles.meta}>
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} — tap to view posts
        </p>
      </header>

      {categories.length === 0 ? (
        <p className={pageStyles.meta}>No categories yet. Add them in Admin → Categories.</p>
      ) : (
        <CategoryList categories={categories} />
      )}
    </div>
  );
}
