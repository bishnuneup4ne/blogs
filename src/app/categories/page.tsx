import { Column, Heading, Meta, Text } from "@once-ui-system/core";
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
      <Column fillWidth marginBottom="xl" gap="xs">
        <Heading variant="display-strong-l">Categories</Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </Text>
      </Column>

      {categories.length === 0 ? (
        <Text variant="body-default-m" onBackground="neutral-weak">
          No categories yet. Add them in Admin → Categories.
        </Text>
      ) : (
        <CategoryList categories={categories} />
      )}
    </div>
  );
}
