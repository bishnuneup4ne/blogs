import { notFound, redirect } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";

export async function generateStaticParams() {
  const { getNavCategories } = await import("@/lib/categories");
  const categories = await getNavCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  redirect(`/blogs?category=${encodeURIComponent(category.name)}`);
}
