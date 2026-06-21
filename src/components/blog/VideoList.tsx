import { getSupabasePostsWithContent } from "@/utils/supabasePosts";
import { formatListDateUpper } from "@/utils/formatDate";
import { VideoGalleryClient } from "./VideoGalleryClient";
import styles from "./VideoList.module.scss";

export async function VideoList({ category = "Personal" }: { category?: string }) {
  const posts = await getSupabasePostsWithContent();

  const videos = posts
    .filter((p) => {
      const cat = (p.metadata as { category?: string }).category?.toLowerCase();
      const video = (p.metadata as { video_url?: string }).video_url?.trim();
      return video && (!category || cat === category.toLowerCase());
    })
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime(),
    );

  if (videos.length === 0) {
    return (
      <p className={styles.empty}>
        No videos yet. Add a writeup with a video URL in Admin → Videos.
      </p>
    );
  }

  const items = videos.map((post, index) => {
    const meta = post.metadata as {
      category?: string;
      video_url?: string;
      tags?: string[];
    };
    const tags = meta.tags || [];

    return {
      slug: post.slug,
      title: post.metadata.title,
      date: formatListDateUpper(post.metadata.publishedAt),
      summary: post.metadata.summary || "",
      content: post.content || "",
      videoUrl: meta.video_url!,
      image: post.metadata.image || "",
      category: meta.category || "",
      tags: [...new Set(tags)],
      index: index + 1,
    };
  });

  return <VideoGalleryClient items={items} />;
};
