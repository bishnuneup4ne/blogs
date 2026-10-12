import { Posts } from "@/components/blog/Posts";
import { VideoList } from "@/components/blog/VideoList";
import { getSupabasePosts } from "@/utils/supabasePosts";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/ui";
import styles from "./personal.module.scss";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Personal",
    description: "Personal blogs and videos",
  };
}

export default async function Personal({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "blogs" } = await searchParams;
  const isVideos = tab === "videos";

  return (
    <PageShell>
      <PageHeader
        title="Personal"
        actions={
          <nav className={styles.tabs} aria-label="Personal sections">
            <Link
              href="/personal?tab=blogs"
              className={!isVideos ? styles.tabActive : styles.tab}
            >
              Blogs
            </Link>
            <Link
              href="/personal?tab=videos"
              className={isVideos ? styles.tabActive : styles.tab}
            >
              Videos
            </Link>
          </nav>
        }
      />

      {isVideos ? (
        <VideoList category="Personal" />
      ) : (
        <Posts
          posts={await getSupabasePosts()}
          category="Personal"
          videoOnly={false}
          variant="minimal"
          showPreview
        />
      )}
    </PageShell>
  );
}
