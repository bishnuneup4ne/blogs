import { Meta, Schema } from "@once-ui-system/core";
import { Posts } from "@/components/blog/Posts";
import { Mailchimp } from "@/components/Mailchimp";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts } from "@/utils/supabasePosts";
import Link from "next/link";
import pageStyles from "@/styles/page-shell.module.scss";

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

function isVideoPost(post: { metadata: { video_url?: string } }) {
  return Boolean(post.metadata.video_url?.trim());
}

export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [config, allPosts] = await Promise.all([getSiteConfig(), getSupabasePosts()]);
  const { blog, person } = config;

  const filtered = category
    ? allPosts.filter(
        (p) =>
          (p.metadata as { category?: string }).category?.toLowerCase() ===
          category.toLowerCase(),
      )
    : allPosts.filter((p) => !isVideoPost(p)).slice(0, 7);

  const title = category ? category : blog.title;

  return (
    <div className={pageStyles.shell}>
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        title={title}
        description={blog.description}
        path={blog.path}
        image={`/api/og/generate?title=${encodeURIComponent(title)}`}
        author={{
          name: person.name,
          url: `${baseURL}/blogs`,
          image: `${baseURL}${person.avatar}`,
        }}
      />

      <header className={pageStyles.header}>
        <h1 className={pageStyles.title}>{title}</h1>
        <p className={pageStyles.meta}>
          {category ? (
            <>
              <Link href="/blogs">← All posts</Link>
              {" · "}
            </>
          ) : null}
          {filtered.length} post{filtered.length === 1 ? "" : "s"}
        </p>
      </header>

      <Posts posts={filtered} variant="minimal" />

      {!category && (
        <section className={pageStyles.newsletter}>
          <Mailchimp marginTop="0" marginBottom="0" padding="l" />
        </section>
      )}
    </div>
  );
}
