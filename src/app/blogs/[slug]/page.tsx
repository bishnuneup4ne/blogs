import { notFound } from "next/navigation";
import { CustomMDX, ScrollToHash } from "@/components";
import { Meta, Schema, Column, HeadingNav, Row, Media } from "@once-ui-system/core";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts, getSupabasePostBySlug } from "@/utils/supabasePosts";
import type { Metadata } from "next";
import { RecentPosts } from "@/components/blog/RecentPosts";
import { ShareSection } from "@/components/blog/ShareSection";
import { VideoEmbed } from "@/components/blog/VideoEmbed";
import { PostHeader } from "@/components/blog/PostHeader";
import styles from "./post.module.scss";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await getSupabasePosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string | string[] }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const slugPath = Array.isArray(routeParams.slug)
    ? routeParams.slug.join("/")
    : routeParams.slug || "";

  const post = await getSupabasePostBySlug(slugPath);
  const config = await getSiteConfig();

  if (!post) return {};

  return Meta.generate({
    title: post.metadata.title,
    description: post.metadata.summary,
    baseURL: baseURL,
    image: post.metadata.image || `/api/og/generate?title=${post.metadata.title}`,
    path: `${config.blog.path}/${post.slug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string | string[] }>;
}) {
  const routeParams = await params;
  const slugPath = Array.isArray(routeParams.slug)
    ? routeParams.slug.join("/")
    : routeParams.slug || "";

  const config = await getSiteConfig();
  const { blog, person, about } = config;
  const post = await getSupabasePostBySlug(slugPath);

  if (!post) notFound();

  const meta = post.metadata as {
    video_url?: string;
    category?: string;
    subtitle?: string;
  };
  const videoUrl = meta.video_url?.trim() || "";
  const isVideoPost = Boolean(videoUrl);
  const category = meta.category || meta.subtitle || "";
  const contentLength = post.content?.trim().length ?? 0;
  const hasBody = isVideoPost ? contentLength > 0 : contentLength > 80;
  const showToc = contentLength > 80;

  return (
    <Row fillWidth>
      <Row maxWidth={12} m={{ hide: true }} />
      <Row fillWidth horizontal="center">
        <Column as="article" maxWidth="s" fillWidth paddingTop="24" paddingX="24">
          <Schema
            as="blogPosting"
            baseURL={baseURL}
            path={`${blog.path}/${post.slug}`}
            title={post.metadata.title}
            description={post.metadata.summary}
            datePublished={post.metadata.publishedAt}
            dateModified={post.metadata.publishedAt}
            image={
              post.metadata.image ||
              `/api/og/generate?title=${encodeURIComponent(post.metadata.title)}`
            }
            author={{
              name: person.name,
              url: `${baseURL}${about.path}`,
              image: `${baseURL}${person.avatar}`,
            }}
          />

          <PostHeader
            title={post.metadata.title}
            date={post.metadata.publishedAt}
            category={category}
            summary={isVideoPost ? post.metadata.summary : undefined}
          />

          {isVideoPost && (
            <div className={styles.videoBlock}>
              <VideoEmbed url={videoUrl} title={post.metadata.title} />
            </div>
          )}

          {!isVideoPost && post.metadata.image && (
            <Media
              src={post.metadata.image}
              alt={post.metadata.title}
              aspectRatio="16/9"
              priority
              sizes="(min-width: 1024px) 100%, (min-width: 768px) 100vw, 100vw"
              border="neutral-alpha-weak"
              radius="m"
              marginBottom="24"
            />
          )}

          {hasBody && (
            <Column as="div" fillWidth className={styles.body}>
              <CustomMDX source={post.content} />
            </Column>
          )}

          <ShareSection
            title={post.metadata.title}
            url={`${baseURL}${blog.path}/${post.slug}`}
          />

          <RecentPosts excludeSlug={post.slug} limit={3} />
          <ScrollToHash />
        </Column>
      </Row>
      {showToc && (
        <Column
          maxWidth={12}
          paddingLeft="40"
          fitHeight
          position="sticky"
          top="80"
          gap="16"
          m={{ hide: true }}
        >
          <HeadingNav fitHeight />
        </Column>
      )}
    </Row>
  );
}
