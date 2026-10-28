"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, useApiCollection, type ApiPost, type ApiTopic } from "./api";
import { Button } from "@/components/admin/Button";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { AdminDialog } from "./Dialog";
import { EmptyState, Segmented, StatusChip, statusTone, Switch, Table } from "@/components/admin/kit";
import { DateCell } from "@/components/admin/kit";
import { PostQuickView } from "@/components/admin/PostQuickView";
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
      featured: Boolean(p.featured), readingMinutes: p.reading_minutes ?? 1,
      cover: p.cover_url, tags: p.tags ?? [], category: p.topic_slug ?? "", authorId: p.author_id ?? "",
    })),
    topics: topicsC.items.map((t) => ({ slug: t.slug, name: t.name })),
  };
  const [tab, setTab] = useState<Tab>("all");
  const [compactH, setCompactH] = useState(compact);
  const [query, setQuery] = useState(urlQuery);
  const [category, setCategory] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "title">("date-desc");
  const [exportOpen, setExportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peekId, setPeekId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setSelected(new Set());
  }, [tab, category, tagFilter, featuredOnly, query]);

  /* Every tag in the library, for the drop-down. */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    state.posts.forEach((p) => p.tags.forEach((t) => t && set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [state.posts]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.posts.length };
    state.posts.forEach((p) => {
      c[p.status] = (c[p.status] ?? 0) + 1;
    });
    return c;
  }, [state.posts]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = state.posts
      .filter((p) => (tab === "all" ? true : p.status === tab))
      .filter((p) => (category === "all" ? true : p.category === category))
      .filter((p) => (tagFilter === "all" ? true : p.tags.includes(tagFilter)))
      .filter((p) => (featuredOnly ? p.featured : true))
      .filter((p) => (q ? `${p.title} ${p.slug} ${p.tags.join(" ")}`.toLowerCase().includes(q) : true));
    switch (sort) {
      case "date-asc": return filtered.sort((a, b) => (a.date > b.date ? 1 : -1));
      case "title": return filtered.sort((a, b) => a.title.localeCompare(b.title));
      default: return filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
  }, [state.posts, tab, category, tagFilter, featuredOnly, sort, query]);

  const categoryName = (slug: string) => state.topics.find((t) => t.slug === slug)?.name ?? slug;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: "publish" | "draft" | "feature" | "delete") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${ids.length} ${ids.length === 1 ? "post" : "posts"}`,
        body: "This removes them from the database. The Undo button on the toast puts them back.",
        confirmLabel: "Delete",
      });
      if (!ok) return;
    }
    setBulkBusy(true);
    setSelected(new Set());
    try {
      const res = await api.post<{ updated?: number; deleted?: number; posts?: unknown[] }>(
        "/api/admin/posts/bulk",
        { action, ids },
      );
      if (action === "delete") {
        const rows = res.posts ?? [];
        toast(`${res.deleted ?? ids.length} deleted`, "success", {
          label: "Undo",
          onClick: async () => {
            try {
              await Promise.all(rows.map((row) => api.post("/api/admin/posts", row)));
              await refresh();
              toast("Posts restored", "success");
            } catch (error) {
              toast(error instanceof Error ? error.message : "Could not restore posts");
            }
          },
        });
      } else {
        const label = action === "feature" ? "Featured" : action === "publish" ? "Published" : "Moved to drafts";
        toast(`${label} ${res.updated ?? ids.length}`, "success");
      }
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function refresh() {
    await postsC.reload();
    router.refresh();
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
          <select className={styles.select} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag">
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
          <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort order">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
          <Button size="sm" variant="text" onClick={() => { setTagFilter("all"); setFeaturedOnly(false); }} disabled={tagFilter === "all" && !featuredOnly}>
            Clear filters
          </Button>
          <Button size="sm" variant="outlined" onClick={() => setExportOpen(true)} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </div>
        <label className={styles.featureToggle}>
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => setFeaturedOnly(e.target.checked)}
            aria-label="Only featured posts"
          />
          <span>Featured</span>
        </label>
      </div>

      {selected.size > 0 ? (
        <div className={styles.bulk} role="region" aria-label="Bulk actions">
          <span>{selected.size} selected</span>
          <Button size="sm" onClick={() => bulk("publish")} disabled={bulkBusy}>Publish</Button>
          <Button size="sm" onClick={() => bulk("draft")} disabled={bulkBusy}>Move to drafts</Button>
          {selected.size === 1 ? (
            <Button size="sm" variant="outlined" onClick={() => bulk("feature")} disabled={bulkBusy}>
              Feature
            </Button>
          ) : null}
          <Button size="sm" variant="text" tone="danger" onClick={() => bulk("delete")} disabled={bulkBusy}>
            Delete
          </Button>
          <Button size="sm" variant="text" onClick={() => setSelected(new Set())} disabled={bulkBusy}>Clear</Button>
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
                    <button
                      type="button"
                      className={styles.thumb}
                      onClick={() => setPeekId(post.id)}
                      aria-label={`Preview ${post.title || "untitled draft"}`}
                      tabIndex={-1}
                    >
                      {post.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.cover} alt="" />
                      ) : null}
                    </button>
                    <div className={styles.postText}>
                      <button type="button" className={styles.postTitle} onClick={() => setPeekId(post.id)}>
                        {post.title || "Untitled draft"}
                      </button>
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
                    <button
                      type="button"
                      className={styles.iconAction}
                      onClick={() => setPeekId(post.id)}
                      aria-label={`Preview ${post.title}`}
                    >
                      <EyeIcon />
                    </button>
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

      {peekId ? (
        <PostQuickView
          key={peekId}
          postId={peekId}
          topics={topicsC.items}
          onClose={() => setPeekId(null)}
          onChanged={() => void refresh()}
        />
      ) : null}

      {exportOpen ? (
        <ExportDialog
          rows={rows}
          categoryName={categoryName}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </div>
  );
}

const EXPORT_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "slug", label: "URL slug" },
  { key: "status", label: "Status" },
  { key: "topic", label: "Topic" },
  { key: "tags", label: "Tags" },
  { key: "date", label: "Date" },
  { key: "readingMinutes", label: "Read time (min)" },
  { key: "featured", label: "Featured" },
] as const;

type ExportRow = {
  title: string;
  slug: string;
  status: string;
  category: string;
  tags: string[];
  date: string;
  featured: boolean;
  readingMinutes: number;
};

/** Popup listing the columns to include; exports the currently filtered rows. */
function ExportDialog({
  rows,
  categoryName,
  onClose,
}: {
  rows: ExportRow[];
  categoryName: (slug: string) => string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [cols, setCols] = useState<Set<string>>(new Set(EXPORT_COLUMNS.map((c) => c.key)));
  const [busy, setBusy] = useState(false);

  function toggleCol(key: string) {
    setCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one column
      } else next.add(key);
      return next;
    });
  }

  function cellValue(row: ExportRow, key: string): string {
    switch (key) {
      case "topic": return categoryName(row.category);
      case "tags": return row.tags.join("; ");
      case "readingMinutes": return String(row.readingMinutes);
      case "featured": return row.featured ? "yes" : "no";
      default: {
        const value = (row as unknown as Record<string, unknown>)[key];
        return value == null ? "" : String(value);
      }
    }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      const keys = EXPORT_COLUMNS.map((c) => c.key).filter((k) => cols.has(k));
      const labels = EXPORT_COLUMNS.filter((c) => cols.has(c.key)).map((c) => c.label);
      const escape = (v: string) => /["`,\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      const lines = [labels.map(escape).join(",")];
      for (const row of rows) lines.push(keys.map((k) => escape(cellValue(row, k))).join(","));
      const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `posts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${rows.length} rows`, "success");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      title="Export posts to CSV"
      onClose={onClose}
      footer={
        <>
          <Button variant="outlined" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={busy} onClick={() => void exportCsv()}>
            {busy ? "Preparing…" : `Export ${rows.length} rows`}
          </Button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: 13 }}>
        Exports the {rows.length} rows matching the current filters, in the current sort order.
      </p>
      <div role="group" aria-label="Columns to include" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", padding: "8px 0" }}>
        {EXPORT_COLUMNS.map((col) => (
          <label key={col.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={cols.has(col.key)} onChange={() => toggleCol(col.key)} />
            {col.label}
          </label>
        ))}
      </div>
    </AdminDialog>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
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
