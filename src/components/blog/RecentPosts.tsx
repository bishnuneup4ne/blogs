import { getSupabasePosts } from "@/utils/supabasePosts";
import { formatListDateUpper } from "@/utils/formatDate";
import { BlogPostList } from "./BlogPostList";
import pageStyles from "@/styles/page-shell.module.scss";

type RecentPostsProps = {
  excludeSlug?: string;
  limit?: number;
};

export async function RecentPosts({ excludeSlug, limit = 3 }: RecentPostsProps) {
  let posts = await getSupabasePosts();

  if (excludeSlug) {
    posts = posts.filter((p) => p.slug !== excludeSlug);
  }

  posts = posts
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime(),
    )
    .slice(0, limit);

  if (posts.length === 0) return null;

  const items = posts.map((post, i) => ({
    slug: post.slug,
    href: `/blogs/${post.slug}`,
    title: post.metadata.title,
    date: formatListDateUpper(post.metadata.publishedAt),
    summary: post.metadata.summary || "",
    image: post.metadata.image || "",
    index: i + 1,
  }));

  return (
    <section className={pageStyles.recent}>
      <h2 className={pageStyles.recentTitle}>More posts</h2>
      <BlogPostList items={items} />
    </section>
  );
}
