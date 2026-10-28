"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type ApiPost, type ApiTopic } from "./api";
import { AdminDialog } from "./Dialog";
import { Button } from "./Button";
import { useConfirm, useToast } from "./Feedback";
import { StatusChip, Switch, statusTone } from "./kit";
import { formatDate, relativeDate } from "@/lib/dates";
import styles from "./PostQuickView.module.scss";

type Loaded = { post: ApiPost; live: boolean };

/** Long enough to be a real paragraph, short enough for a card. */
function excerpt(summary: string, blocks: unknown[], limit = 260): string {
  const base = summary.trim() || plainText(blocks);
  if (!base) return "";
  return base.length > limit ? `${base.slice(0, limit).trimEnd()}…` : base;
}

function plainText(blocks: unknown[]): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") return out.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      const tag = typeof record.type === "string" ? record.type : "";
      if (/heading|quote|paragraph|text|list|table|footnote/i.test(tag)) {
        Object.values(record).forEach(walk);
      }
    }
  };
  walk(blocks);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function PostQuickView({
  postId,
  topics,
  onClose,
  onChanged,
}: {
  postId: string;
  topics: ApiTopic[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api.get<Loaded>(`/api/admin/posts/${postId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this post");
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = data?.post;

  async function run(key: string, task: () => Promise<string>) {
    setBusy(key);
    try {
      toast(await task(), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work");
    } finally {
      setBusy("");
    }
  }

  async function toggleFeatured(next: boolean) {
    if (!post) return;
    await run("feature", async () => {
      await api.post("/api/admin/posts/bulk", { action: next ? "feature" : "unfeature", ids: [post.id] });
      setData((current) => (current ? { ...current, post: { ...current.post, featured: next } } : current));
      onChanged();
      return next ? "This post now leads the home page" : "Removed from the home lead";
    });
  }

  async function togglePublished(next: boolean) {
    if (!post) return;
    await run("status", async () => {
      await api.patch<{ post: ApiPost }>(`/api/admin/posts/${post.id}`, { status: next ? "published" : "draft" });
      await load();
      onChanged();
      return next ? "Published — it is live on the site" : "Moved back to drafts";
    });
  }

  async function duplicate() {
    if (!post) return;
    await run("duplicate", async () => {
      const res = await api.post<{ posts: { slug: string }[] }>("/api/admin/posts/bulk", {
        action: "duplicate",
        ids: [post.id],
      });
      onChanged();
      return `Draft copy created${res.posts[0] ? ` as /${res.posts[0].slug}` : ""}`;
    });
  }

  async function remove() {
    if (!post) return;
    const ok = await confirm({
      title: "Delete post",
      body: `Delete “${post.title}”? You can undo this from the toast.`,
      confirmLabel: "Delete post",
    });
    if (!ok) return;
    await run("delete", async () => {
      await api.del(`/api/admin/posts/${post.id}?hard=1`);
      onChanged();
      toast("Post deleted", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/posts", post);
            onChanged();
            toast("Post restored", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore post");
          }
        },
      });
      onClose();
      return "Post deleted";
    });
  }

  const topic = topics.find((t) => t.slug === post?.topic_slug);
  const updated = post ? relativeDate(String(post.updated_at ?? post.date)) || formatDate(post.date) : "";

  return (
    <AdminDialog
      title={post?.title || (error ? "Post" : "Loading…")}
      wide
      onClose={onClose}
      footerStart={
        post ? (
          <label className={styles.feature}>
            <Switch
              checked={post.featured}
              onChange={toggleFeatured}
              aria-label="Feature on the home page"
            />
            <span>
              <strong>Lead the home page</strong>
              <em>{post.featured ? "Featured now — only one post at a time" : "Replaces whichever post is featured"}</em>
            </span>
          </label>
        ) : null
      }
      footer={
        post ? (
          <>
            <Button variant="text" tone="danger" onClick={remove} disabled={Boolean(busy)}>
              Delete
            </Button>
            <Button variant="outlined" onClick={duplicate} disabled={Boolean(busy)}>
              {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
            </Button>
            <Link href={`/admin/posts/${post.id}/edit`} className={styles.primaryLink}>
              Edit post
            </Link>
          </>
        ) : null
      }
    >
      {error ? (
        <div className={styles.state} role="alert">
          <p>{error}</p>
          <Button variant="outlined" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : !post ? (
        <div className={styles.skeleton} aria-label="Loading post" aria-busy="true">
          <span className={styles.skCover} />
          <span className={styles.skLine} />
          <span className={styles.skLine} />
          <span className={styles.skLineShort} />
        </div>
      ) : (
        <>
          {post.cover_url ? (
            <div className={styles.cover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_url} alt={post.cover_alt || ""} />
            </div>
          ) : null}

          <div className={styles.meta}>
            <StatusChip status={post.status} tone={statusTone(post.status)} />
            {topic ? <span className={styles.topic}>{topic.name}</span> : null}
            <span>{post.reading_minutes} min read</span>
            <span title={post.date}>{formatDate(post.date)}</span>
            {post.updated_at ? <span>Edited {updated}</span> : null}
          </div>

          <p className={styles.slug}>
            <code>/{post.slug}</code>
            {data?.live ? (
              <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer noopener">
                Open live page ↗
              </a>
            ) : (
              <span className={styles.notLive}>Not public — {post.status}</span>
            )}
          </p>

          {excerpt(post.summary, post.blocks) ? (
            <p className={styles.excerpt}>{excerpt(post.summary, post.blocks)}</p>
          ) : (
            <p className={styles.excerptMuted}>No summary or body text yet.</p>
          )}

          {post.tags.length ? (
            <ul className={styles.tags} aria-label="Tags">
              {post.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          ) : null}

          <div className={styles.statusRow}>
            <span>
              <strong>{post.status === "published" ? "Published" : "Held back"}</strong>
              <em>
                {post.status === "published"
                  ? "Visible to every reader and in feeds."
                  : "Only you can see this in Studio."}
              </em>
            </span>
            <Button
              variant={post.status === "published" ? "outlined" : "filled"}
              size="sm"
              onClick={() => togglePublished(post.status !== "published")}
              disabled={Boolean(busy)}
            >
              {busy === "status"
                ? "Working…"
                : post.status === "published"
                  ? "Unpublish"
                  : "Publish now"}
            </Button>
          </div>
        </>
      )}
    </AdminDialog>
  );
}
