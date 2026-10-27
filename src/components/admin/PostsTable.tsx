"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, useApiCollection, type ApiPost, type ApiTopic } from "./api";
import { Button } from "@/components/admin/Button";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { EmptyState, Segmented, StatusChip, statusTone, Switch, Table } from "@/components/admin/kit";
import { DateCell } from "@/components/admin/kit";
import { formatDate } from "@/lib/dates";

import styles from "./PostsTable.module.scss";type Tab = "all" | ApiPost["status"];
export function PostsTable() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const topicsC = useApiCollection<ApiTopic>("/api/admin/topics", "topics");
  const compact = params.get("compact") === "1";
  const state = {
    posts: postsC.items.map((p) => ({
      id: p.id, title: p.title, slug: p.slug, status: p.status, date: p.date,
      cover: p.cover_url, tags: p.tags ?? [], category: p.topic_slug ?? "", authorId: p.author_id ?? "",
    })),
    topics: topicsC.items.map((t) => ({ slug: t.slug, name: t.name })),
  };
  const [tab, setTab] = useState<Tab>("all");
  const [compactH, setCompactH] = useState(compact);
  const [query, setQuery] = useState(urlQuery);
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setSelected(new Set());
  }, [tab, category, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.posts.length };
    state.posts.forEach((p) => {
      c[p.status] = (c[p.status] ?? 0) + 1;
    });
    return c;
  }, [state.posts]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.posts
      .filter((p) => (tab === "all" ? true : p.status === tab))
      .filter((p) => (category === "all" ? true : p.category === category))
      .filter((p) => (q ? `${p.title} ${p.slug} ${p.tags.join(" ")}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state.posts, tab, category, query]);

  const categoryName = (slug: string) => state.topics.find((t) => t.slug === slug)?.name ?? slug;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(status: ApiPost["status"]) {
    const ids = [...selected];
    setSelected(new Set());
    try {
      await Promise.all(ids.map((id) => api.patch(`/api/admin/posts/${id}`, { status })));
      toast("Bulk update successful");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Bulk update failed");
    } finally {
      await postsC.reload();
      router.refresh();
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <Segmented<Tab>
          label="Filter by status"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published ?? 0 },
            { value: "draft", label: "Drafts", count: counts.draft ?? 0 },
            { value: "review", label: "In review", count: counts.review ?? 0 },
            { value: "scheduled", label: "Scheduled", count: counts.scheduled ?? 0 },
          ]}
        />

        <div className={styles.controls}>
          <label className={styles.search}>
            <span className="sr-only">Search posts</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts" />
          </label>
          <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by topic">
            <option value="all">All topics</option>
            {state.topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className={styles.bulk}>
          <span>{selected.size} selected</span>
          <Button size="sm" onClick={() => bulk("published")}>Publish</Button>
          <Button size="sm" onClick={() => bulk("draft")}>Move to drafts</Button>
          <Button size="sm" variant="text" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      ) : null}

      <label className={styles.density}>
        <span>Compact</span>
        <Switch
          checked={compactH}
          onChange={(v) => setCompactH(v)}
          aria-label="Switch table density"
        />
      </label>

      {postsC.loading ? (
        <p className={styles.muted}>Loading posts…</p>
      ) : postsC.error ? (
        <p className={styles.muted}>Could not load posts: {postsC.error}</p>
      ) : rows.length === 0 ? (
        <div className={styles.emptyCard}>
          <EmptyState
            title="No posts match this view"
            body="Try a different status tab, clear the search, or start a new post."
            action="New post"
            href="/admin/posts/new"
          />
        </div>
      ) : (
        <Table compact={compactH}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                  }
                />
              </th>
              <th>Post</th>
              <th>Status</th>
              <th>Topic</th>
              <th>Author</th>
              <th>Date</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((post) => (
              <tr key={post.id}>
                <td className={styles.checkCol} data-label="Select">
                  <input
                    type="checkbox"
                    aria-label={`Select ${post.title || "untitled"}`}
                    checked={selected.has(post.id)}
                    onChange={() => toggle(post.id)}
                  />
                </td>
                <td data-label="Post" data-card="title">
                  <div className={styles.postCell}>
                    <span className={styles.thumb}>
                      {post.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.cover} alt="" />
                      ) : null}
                    </span>
                    <div className={styles.postText}>
                      <Link href={`/admin/posts/${post.id}/edit`} className={styles.postTitle}>
                        {post.title || "Untitled draft"}
                      </Link>
                      <span className={styles.postSlug}>/{post.slug || "untitled"}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Status"><StatusChip status={post.status} tone={statusTone(post.status)} /></td>
                <td data-label="Topic">{categoryName(post.category)}</td>
                <td data-label="Author">
                  <span title="Single-author blog — every post is published by the site owner">Bishnu Neupane</span>
                </td>
              <DateCell iso={post.date} label="Date" />
              <td data-label="Actions" data-card="actions">
                  <div className={styles.rowActions}>
                    <Link href={`/admin/posts/${post.id}/edit`} className={styles.iconAction} aria-label={`Edit ${post.title}`}>
                      <PencilIcon />
                    </Link>
                    <Link href={`/blog/${post.slug}`} target="_blank" rel="noreferrer noopener" className={styles.iconAction} aria-label="View post">
                      <OpenIcon />
                    </Link>
                    <button
                      type="button"
                      className={styles.iconAction}
                      aria-label={`Delete ${post.title}`}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete post",
                          body: `Delete “${post.title}”? You can undo this from the toast.`,
                          confirmLabel: "Delete post",
                        });
                        if (!ok) return;
                        try {
                          const snapshot = await api.get<{ post: unknown }>(`/api/admin/posts/${post.id}`);
                          await api.del(`/api/admin/posts/${post.id}?hard=1`);
                          toast("Post deleted", "success", {
                            label: "Undo",
                            onClick: async () => {
                              try {
                                await api.post("/api/admin/posts", snapshot.post);
                                await postsC.reload();
                                router.refresh();
                                toast("Post restored", "success");
                              } catch (error) {
                                toast(error instanceof Error ? error.message : "Could not restore post");
                              }
                            },
                          });
                          await postsC.reload();
                          router.refresh();
                        } catch (error) {
                          toast(error instanceof Error ? error.message : "Delete failed");
                        }
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4.5h5.5V10M19 5l-8 8" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9L17.5 7" />
    </svg>
  );
}
