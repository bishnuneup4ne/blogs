"use client";

import { useState } from "react";
import { api, useApiCollection, type ApiPost, type ApiSeries } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { PageHeader, StatusChip, statusTone } from "@/components/admin/kit";
import styles from "./series.module.scss";

interface SeriesDraft {
  id?: string;
  title: string;
  description: string;
  postIds: string[];
  status: "draft" | "live";
}

export default function AdminSeriesPage() {
  const seriesC = useApiCollection<ApiSeries>("/api/admin/series", "series");
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const state = {
    series: seriesC.items.map((sr) => ({ id: sr.id, title: sr.title, description: sr.description, status: sr.status, postIds: sr.post_ids ?? [] })),
    posts: postsC.items.map((p) => ({ id: p.id, title: p.title, status: p.status })),
  };
  const [editing, setEditing] = useState<SeriesDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = (id: string) => state.posts.find((p) => p.id === id)?.title ?? "Missing post";

  function blank(): SeriesDraft {
    return { title: "", description: "", postIds: [], status: "draft" };
  }

  async function save() {
    if (!editing || !editing.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = { title: editing.title, description: editing.description, status: editing.status, post_ids: editing.postIds };
      if (editing.id) await api.patch(`/api/admin/series/${editing.id}`, payload);
      else await api.post<{ series: ApiSeries }>("/api/admin/series", payload);
      setEditing(null);
      await seriesC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”?`)) return;
    try {
      await api.del(`/api/admin/series/${id}`);
      seriesC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Series"
        description="Group published posts into a sequence. Live series appear on post pages and at /series/{slug}."
        actions={<Button onClick={() => setEditing(blank())}>New series</Button>}
      />

      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {seriesC.loading ? <p className={styles.emptyNote}>Loading series…</p> : null}
      {seriesC.error ? <p role="alert" className={styles.formError}>Could not load series: {seriesC.error}</p> : null}
      {!seriesC.loading && !seriesC.error && state.series.length === 0 ? (
        <p className={styles.emptyNote}>No series yet. Group published posts into a reading sequence.</p>
      ) : null}

      <div className={styles.wrap}>
        {state.series.map((series) => (
          <article key={series.id} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowHead}>
                <h2 className={styles.title}>{series.title}</h2>
                <StatusChip status={series.status} tone={statusTone(series.status)} />
              </div>
              <p className={styles.desc}>{series.description}</p>
              <ol className={styles.items}>
                {series.postIds.map((id) => (
                  <li key={id}>{title(id)}</li>
                ))}
                {series.postIds.length === 0 ? <li className={styles.none}>No posts yet</li> : null}
              </ol>
            </div>
            <div className={styles.rowActions}>
              <Button size="sm" variant="outlined" onClick={() => setEditing({ id: series.id, title: series.title, description: series.description, postIds: series.postIds, status: series.status as SeriesDraft["status"] })}>Edit</Button>
              <Button
                size="sm"
                variant="text"
                tone="danger"
                onClick={() => remove(series.id, series.title)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <div className={styles.drawerWrap} role="dialog" aria-modal="true" aria-label="Edit series">
          <div className={styles.drawer}>
            <h2 className={styles.drawerTitle}>{editing.id ? "Edit series" : "New series"}</h2>
            <label className={styles.field}>
              <span>Title</span>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Description</span>
              <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <div className={styles.field}>
              <span>Posts in this series</span>
              <div className={styles.picker}>
                {state.posts.filter((p) => p.status === "published").map((post) => (
                  <label key={post.id} className={styles.pickRow}>
                    <input
                      type="checkbox"
                      checked={editing.postIds.includes(post.id)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          postIds: e.target.checked
                            ? [...editing.postIds, post.id]
                            : editing.postIds.filter((id) => id !== post.id),
                        })
                      }
                    />
                    {post.title}
                  </label>
                ))}
              </div>
            </div>
            <label className={styles.field}>
              <span>Status</span>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as SeriesDraft["status"] })}
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
              </select>
            </label>
            <div className={styles.drawerFoot}>
              <span className={styles.spacer} />
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.title.trim() || busy} onClick={save}>
                {busy ? "Saving…" : "Save series"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
