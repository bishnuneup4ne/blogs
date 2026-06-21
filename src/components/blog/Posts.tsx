import { getSupabasePosts } from "@/utils/supabasePosts";
import { formatCalendarDate, formatListDateUpper } from "@/utils/formatDate";
import { Grid } from "@once-ui-system/core";
import { BlogPostList } from "./BlogPostList";
import Post from "./Post";

export type BlogPostListItem = Awaited<ReturnType<typeof getSupabasePosts>>[number];

interface PostsProps {
  /** Pass preloaded posts to avoid duplicate Supabase calls on the same page */
  posts?: BlogPostListItem[];
  range?: [number] | [number, number];
  columns?: "1" | "2" | "3";
  thumbnail?: boolean;
  /** compact = small row; minimal = title only; default = magazine cards */
  variant?: "default" | "compact" | "minimal";
  direction?: "row" | "column";
  exclude?: string[];
  category?: string;
  videoOnly?: boolean;
  /** Hover preview in list (disabled for video tab) */
  showPreview?: boolean;
}

export async function Posts({
  posts: postsProp,
  range,
  columns = "1",
  thumbnail = false,
  variant = "default",
  exclude = [],
  direction,
  category,
  videoOnly,
  showPreview = true,
}: PostsProps) {
  let allBlogs = postsProp ?? (await getSupabasePosts());

  if (exclude.length) {
    allBlogs = allBlogs.filter((post) => !exclude.includes(post.slug));
  }
  
  if (category) {
    allBlogs = allBlogs.filter((post) => (post.metadata as any).category?.toLowerCase() === category.toLowerCase());
  }

  if (videoOnly === true) {
    allBlogs = allBlogs.filter((post) => !!(post.metadata as any).video_url);
  } else if (videoOnly === false) {
    // If explicitly false, exclude videos
    allBlogs = allBlogs.filter((post) => !(post.metadata as any).video_url);
  }

  const sortedBlogs = allBlogs.sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime();
  });

  const displayedBlogs = range
    ? sortedBlogs.slice(range[0] - 1, range.length === 2 ? range[1] : sortedBlogs.length)
    : sortedBlogs;

  const isCompact = variant === "compact";
  const isMinimal = variant === "minimal";
  const listVariant = isMinimal || isCompact;

  if (listVariant && displayedBlogs.length > 0) {
    const listItems = displayedBlogs.map((post, i) => ({
      slug: post.slug,
      href: `/blogs/${post.slug}`,
      title: post.metadata.title,
      date: formatListDateUpper(post.metadata.publishedAt),
      summary: post.metadata.summary || "",
      image: post.metadata.image || "",
      index: (range?.[0] ?? 1) + i,
    }));

    return <BlogPostList items={listItems} showPreview={showPreview} />;
  }

  return (
    <>
      {displayedBlogs.length > 0 && (
        <Grid
          columns={columns}
          s={{ columns: 1 }}
          fillWidth
          marginBottom="40"
          gap="16"
        >
          {displayedBlogs.map((post) => (
            <Post
              key={post.slug}
              post={post}
              displayDate={formatCalendarDate(post.metadata.publishedAt)}
              thumbnail={thumbnail}
              direction={direction}
              variant={variant}
            />
          ))}
        </Grid>
      )}
    </>
  );
}
