"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiPost, type ApiSeries } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "@/components/admin/Dialog";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { PageHeader } from "@/components/admin/kit";
import styles from "./series.module.scss";

interface SeriesDraft {
  id?: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string;
  status: "draft" | "live";
  post_ids: string[];
}

export default function AdminSeriesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const seriesC = useApiCollection<ApiSeries>("/api/admin/series", "series");
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const [editing, setEditing] = useState<SeriesDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const published = postsC.items.filter((p) => p.status === "published");

  function blank(): SeriesDraft {
    return { slug: "", title: "", description: "", cover_url: "", status: "live", post_ids: [] };
  }

  function open(series: ApiSeries) {
    setEditing({
      id: series.id,
      slug: series.slug,
      title: series.title,
      description: series.description,
      cover_url: series.cover_url ?? "",
      status: series.status,
      post_ids: series.post_ids ?? [],
    });
  }

  async function save() {
    if (!editing || !editing.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...editing, slug: editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
      if (editing.id) await api.patch(`/api/admin/series/${editing.id}`, payload);
      else await api.post("/api/admin/series", payload);
      setEditing(null);
      toast("Series saved", "success");
      seriesC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(series: SeriesDraft) {
    if (!series.id) return;
    const ok = await confirm({
      title: "Delete series",
      body: `Delete “${series.title}”? The posts themselves are untouched.`,
      confirmLabel: "Delete series",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/series/${series.id}`);
      setEditing(null);
      toast("Series deleted", "success");
      seriesC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function togglePost(id: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      post_ids: editing.post_ids.includes(id)
        ? editing.post_ids.filter((x) => x !== id)
        : [...editing.post_ids, id],
    });
  }

  function move(id: string, dir: -1 | 1) {
    if (!editing) return;
    const i = editing.post_ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= editing.post_ids.length) return;
    const next = [...editing.post_ids];
    [next[i], next[j]] = [next[j], next[i]];
    setEditing({ ...editing, post_ids: next });
  }

  const titleOf = (id: string) => published.find((p) => p.id === id)?.title ?? "Unknown post";

  return (
    <div>
      <PageHeader
        title="Series"
        description="Curated reading orders published at /series/<slug>. A live series only shows on the site when all its posts are published."
        actions={<Button onClick={() => setEditing(blank())}>New series</Button>}
      />

      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {seriesC.loading ? <p className={styles.emptyNote}>Loading series…</p> : null}
      {seriesC.error ? <p role="alert" className={styles.formError}>Could not load series: {seriesC.error}</p> : null}
      {!seriesC.loading && !seriesC.error && seriesC.items.length === 0 ? (
        <p className={styles.emptyNote}>No series yet. Group a few posts into a reading order.</p>
      ) : null}

      <div className={styles.grid}>
        {seriesC.items.map((series) => (
          <article key={series.id} className={`${styles.card} ${series.status === "draft" ? styles.draft : ""}`}>
            <div className={styles.cardTop}>
              <span className={styles.slug}>/{series.slug}</span>
              <button
                type="button"
                className={styles.kebab}
                aria-label={`Options for ${series.title}`}
                onClick={() => open(series)}
              >
                •••
              </button>
            </div>
            <h2 className={styles.name}>{series.title}</h2>
            <p className={styles.desc}>{series.description}</p>
            <div className={styles.foot}>
              <span>
                {series.posts ?? 0} {series.posts === 1 ? "post" : "posts"} · {series.status}
              </span>
              {series.status === "live" ? (
                <Link href={`/series/${series.slug}`} target="_blank" className={styles.link}>View</Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <button type="button" className={styles.addCard} onClick={() => setEditing(blank())}>
        + New series
      </button>

      {editing ? (
        <AdminDialog
          title={editing.id ? "Edit series" : "New series"}
          onClose={() => setEditing(null)}
          footerStart={
            editing.id ? (
              <Button variant="text" tone="danger" disabled={busy} onClick={() => remove(editing)}>
                Delete
              </Button>
            ) : null
          }
          footer={
            <>
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.title.trim() || busy} onClick={save}>
                {busy ? "Saving…" : "Save series"}
              </Button>
            </>
          }
        >
          <label>
            <span>Title</span>
            <input
              value={editing.title}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  title: e.target.value,
                  slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                })
              }
            />
            {!editing.title.trim() ? <span className={styles.fieldError}>A title is required.</span> : null}
          </label>
          <label>
            <span>Slug</span>
            <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </label>
          <label>
            <span>Description</span>
            <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <MediaPicker
            label="Cover photo"
            value={editing.cover_url}
            onChange={(src) => setEditing({ ...editing, cover_url: src })}
          />
          <div className={styles.field}>
            <span>Status</span>
            <div className={styles.statusRow}>
              <Button
                variant={editing.status === "live" ? "filled" : "outlined"}
                onClick={() => setEditing({ ...editing, status: "live" })}
              >
                Live
              </Button>
              <Button
                variant={editing.status === "draft" ? "filled" : "outlined"}
                onClick={() => setEditing({ ...editing, status: "draft" })}
              >
                Draft
              </Button>
            </div>
          </div>
          <div className={styles.field}>
            <span>Posts — pick in reading order</span>
            <ul className={styles.postList}>
              {published.map((post) => {
                const selected = editing.post_ids.includes(post.id);
                return (
                  <li key={post.id} className={selected ? styles.postSelected : undefined}>
                    <label className={styles.postRow}>
                      <input type="checkbox" checked={selected} onChange={() => togglePost(post.id)} />
                      <span className={styles.postTitle}>{post.title}</span>
                    </label>
                    {selected ? (
                      <span className={styles.postOrder}>
                        #{editing.post_ids.indexOf(post.id) + 1}
                        <button type="button" onClick={() => move(post.id, -1)} disabled={editing.post_ids.indexOf(post.id) === 0} aria-label="Move earlier">↑</button>
                        <button type="button" onClick={() => move(post.id, 1)} disabled={editing.post_ids.indexOf(post.id) === editing.post_ids.length - 1} aria-label="Move later">↓</button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {editing.post_ids.length > 0 ? (
              <ol className={styles.orderPreview}>
                {editing.post_ids.map((id) => (
                  <li key={id}>{titleOf(id)}</li>
                ))}
              </ol>
            ) : null}
          </div>
        </AdminDialog>
      ) : null}
    </div>
  );
}
