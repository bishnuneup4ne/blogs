import { baseURL, routes as routesConfig } from "@/resources";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { getSupabaseProjects } from "@/utils/supabaseProjects";

export default async function sitemap() {
  const blogs = (await getSupabasePosts()).map((post) => ({
    url: `${baseURL}/blogs/${post.slug}`,
    lastModified: post.metadata.publishedAt,
  }));

  const works = routesConfig["/work"]
    ? (await getSupabaseProjects()).map((post) => ({
        url: `${baseURL}/work/${post.slug}`,
        lastModified: post.metadata.publishedAt,
      }))
    : [];

  // /category/* exists only to 301 into /blogs?category=..., so submitting those
  // URLs just puts redirect stubs in the index.
  const staticPaths = ["/", "/blogs", "/categories", "/gallery", "/personal", "/work"].filter(
    (path) => path === "/" || routesConfig[path as keyof typeof routesConfig],
  );

  const routes = staticPaths.map((route) => ({
    url: `${baseURL}${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...blogs, ...works];
}
