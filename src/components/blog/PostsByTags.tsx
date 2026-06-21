"use client";

import { useEffect, useState } from "react";
import { formatListDateUpper } from "@/utils/formatDate";
import { BlogPostList } from "./BlogPostList";
import pageStyles from "@/styles/page-shell.module.scss";

type Post = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  featured_image_url: string;
  created_at: string;
  tags: string[];
};

type PostsByTagsProps = {
  tags: string[];
  limit?: number;
  title?: string;
  excludeSlug?: string;
};

export function PostsByTags({
  tags,
  limit = 5,
  title = "Related posts by tags",
  excludeSlug,
}: PostsByTagsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!tags || tags.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      try {
        const tagString = tags.join(",");
        const response = await fetch(
          `/api/writeups/by-tags?tags=${encodeURIComponent(tagString)}&limit=${limit * 2}`
        );

        if (!response.ok) {
          console.error("Failed to fetch posts by tags");
          setPosts([]);
          return;
        }

        let fetchedPosts = (await response.json()) as Post[];

        if (excludeSlug) {
          fetchedPosts = fetchedPosts.filter((p) => p.slug !== excludeSlug);
        }

        setPosts(fetchedPosts.slice(0, limit));
      } catch (error) {
        console.error("Error fetching posts by tags:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [tags, limit, excludeSlug]);

  if (loading) {
    return (
      <section className={pageStyles.recent}>
        <h2 className={pageStyles.recentTitle}>{title}</h2>
        <p>Loading related posts...</p>
      </section>
    );
  }

  if (posts.length === 0) return null;

  const items = posts.map((post, i) => ({
    slug: post.slug,
    href: `/blogs/${post.slug}`,
    title: post.title,
    date: formatListDateUpper(post.created_at),
    summary: post.summary || "",
    image: post.featured_image_url || "",
    index: i + 1,
  }));

  return (
    <section className={pageStyles.recent}>
      <h2 className={pageStyles.recentTitle}>{title}</h2>
      <BlogPostList items={items} />
    </section>
  );
}
