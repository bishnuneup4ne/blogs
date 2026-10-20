import { Meta } from "@once-ui-system/core";
import { BlogsView } from "@/components/blog/BlogsView";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";

export const revalidate = 60;

export async function generateMetadata() {
  const config = await getSiteConfig();
  // The home feed and /blogs are two live URLs. /blogs owns config.blog.path,
  // so "/" must canonicalise to itself or both pages claim the same canonical.
  return Meta.generate({
    title: config.home.title,
    description: config.home.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(config.home.title)}`,
    path: "/",
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  return <BlogsView searchParams={searchParams} basePath="/" />;
}
