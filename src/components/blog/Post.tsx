"use client";

import { Card, Column, Media, Row, Text } from "@once-ui-system/core";
import styles from "./Post.module.scss";

interface PostProps {
  post: {
    slug: string;
    metadata: {
      title: string;
      publishedAt: string;
      image?: string;
      summary?: string;
      tag?: string;
      category?: string;
      video_url?: string;
    };
  };
  thumbnail: boolean;
  direction?: "row" | "column";
  variant?: "default" | "compact" | "minimal";
  /** Pre-formatted on the server to avoid hydration mismatches */
  displayDate?: string;
}

export default function Post({
  post,
  thumbnail,
  direction,
  variant = "default",
  displayDate,
}: PostProps) {
  const dateLabel = displayDate ?? post.metadata.publishedAt;
  const hasVideo = Boolean(post.metadata.video_url);

  if (variant === "minimal") {
    return (
      <Card
        fillWidth
        href={`/blogs/${post.slug}`}
        className={styles.minimalRow}
        background="transparent"
        border="transparent"
        padding="0"
        radius="m"
        transition="micro-medium"
      >
        <span className={styles.videoBadge}>{hasVideo ? "▶" : ""}</span>
        <span className={styles.title}>{post.metadata.title}</span>
        <span className={styles.meta} suppressHydrationWarning>
          {dateLabel}
        </span>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card
        fillWidth
        href={`/blogs/${post.slug}`}
        className={styles.compactRow}
        direction="row"
        vertical="center"
        gap="12"
        padding="12"
        radius="m"
        border="transparent"
        background="transparent"
        transition="micro-medium"
      >
        {post.metadata.image && thumbnail && (
          <Media
            sizes="80px"
            src={post.metadata.image}
            alt=""
            radius="s"
            style={{ width: 56, height: 56, minWidth: 56, objectFit: "cover" }}
          />
        )}
        <Column gap="4" flex={1} style={{ minWidth: 0 }}>
          <Text variant="label-default-xs" onBackground="neutral-weak">
            {dateLabel}
            {post.metadata.category ? ` · ${post.metadata.category}` : ""}
            {hasVideo ? " · Video" : ""}
          </Text>
          <Text variant="body-strong-s" style={{ lineHeight: 1.35 }}>
            {post.metadata.title}
          </Text>
        </Column>
      </Card>
    );
  } 

  return (
    <Card
      fillWidth
      href={`/blogs/${post.slug}`}
      transition="micro-medium"
      direction={direction}
      border="transparent"
      background="transparent"
      padding="4"
      radius="l-4"
      gap={direction === "column" ? undefined : "24"}
      s={{ direction: "column" }}
    >
      {post.metadata.image && thumbnail && (
        <Media
          priority
          sizes="(max-width: 768px) 100vw, 640px"
          border="neutral-alpha-weak"
          cursor="interactive"
          radius="l"
          src={post.metadata.image}
          alt={"Thumbnail of " + post.metadata.title}
          aspectRatio="16 / 9"
        />
      )}
      <Row fillWidth>
        <Column maxWidth={28} paddingY="24" paddingX="l" gap="20" vertical="center">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {dateLabel}
          </Text>
          <Text variant="heading-strong-l" wrap="balance">
            {post.metadata.title}
          </Text>
          {post.metadata.tag && (
            <Text variant="label-strong-s" onBackground="neutral-weak">
              {post.metadata.tag}
            </Text>
          )}
        </Column>
      </Row>
    </Card>
  );
}
