import { Meta } from "@once-ui-system/core";
import { BlogsView } from "@/components/blog/BlogsView";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";

export const revalidate = 60;

export async function generateMetadata() {
  const config = await getSiteConfig();
  return Meta.generate({
    title: config.blog.title,
    description: config.blog.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(config.blog.title)}`,
    path: config.blog.path,
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  return <BlogsView searchParams={searchParams} basePath="/" />;
}
