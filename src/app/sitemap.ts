import { baseURL, routes as routesConfig } from "@/resources";
import { getNavCategories } from "@/lib/categories";
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

  const categories = (await getNavCategories()).map((cat) => ({
    url: `${baseURL}/category/${cat.slug}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  const staticPaths = ["/blogs", "/categories", "/gallery", "/personal", "/work"].filter(
    (path) => routesConfig[path as keyof typeof routesConfig],
  );

  const routes = staticPaths.map((route) => ({
    url: `${baseURL}${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...categories, ...blogs, ...works];
}
