"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiPost, type ApiTopic } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { PageHeader } from "@/components/admin/kit";
import styles from "./topics.module.scss";

const PASTELS = ["blue", "green", "mint", "yellow", "red", "purple", "gray"];

interface TopicDraft {
  id?: string;
  slug: string;
  name: string;
  description: string;
  pastel: string;
  color: string;
  sort_order: number;
}

export default function AdminTopicsPage() {
  const router = useRouter();
  const topicsC = useApiCollection<ApiTopic>("/api/admin/topics", "topics");
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const [editing, setEditing] = useState<TopicDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const count = (slug: string) => postsC.items.filter((p) => p.topic_slug === slug).length;

  function blank(): TopicDraft {
    return { slug: "", name: "", description: "", pastel: "blue", color: "", sort_order: topicsC.items.length + 1 };
  }

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...editing, slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
      if (editing.id) await api.patch(`/api/admin/topics/${editing.id}`, payload);
      else await api.post("/api/admin/topics", payload);
      setEditing(null);
      topicsC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? Posts in this topic will fall back to uncategorised.`)) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/topics/${id}`);
      topicsC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Topics"
        description="Topics drive the pill filters on the feed and the sections in the navigation."
        actions={<Button onClick={() => setEditing(blank())}>New topic</Button>}
      />

      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {topicsC.loading ? <p className={styles.emptyNote}>Loading topics…</p> : null}
      {topicsC.error ? <p role="alert" className={styles.formError}>Could not load topics: {topicsC.error}</p> : null}
      {!topicsC.loading && !topicsC.error && topicsC.items.length === 0 ? (
        <p className={styles.emptyNote}>No topics yet. Create one to organise posts.</p>
      ) : null}

      <div className={styles.grid}>
        {topicsC.items.map((topic) => (
          <article key={topic.id} className={`${styles.card} pastel-${topic.pastel}`}>
            <div className={styles.cardTop}>
              <span className={styles.slug}>/{topic.slug}</span>
              <button
                type="button"
                className={styles.kebab}
                aria-label={`Options for ${topic.name}`}
                onClick={() => setEditing({ id: topic.id, slug: topic.slug, name: topic.name, description: topic.description, pastel: topic.pastel, color: topic.color, sort_order: topic.sort_order })}
              >
                •••
              </button>
            </div>
            <h2 className={styles.name}>{topic.name}</h2>
            <p className={styles.desc}>{topic.description}</p>
            <div className={styles.foot}>
              <span>{count(topic.slug)} posts</span>
              <Link href={`/blog/category/${topic.slug}`} target="_blank" className={styles.link}>View</Link>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className={styles.addCard} onClick={() => setEditing(blank())}>
        + New topic
      </button>

      {editing ? (
        <div className={styles.drawerWrap} role="dialog" aria-modal="true" aria-label="Edit topic">
          <div className={styles.drawer}>
            <h2 className={styles.drawerTitle}>{editing.id ? "Edit topic" : "New topic"}</h2>
            <label className={styles.field}>
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                  })
                }
              />
            </label>
            <label className={styles.field}>
              <span>Slug</span>
              <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Description</span>
              <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <div className={styles.field}>
              <span>Colour</span>
              <div className={styles.swatches}>
                {PASTELS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.swatch} pastel-${p} ${editing.pastel === p ? styles.swatchActive : ""}`}
                    onClick={() => setEditing({ ...editing, pastel: p })}
                    aria-label={p}
                  />
                ))}
              </div>
            </div>
            <div className={styles.drawerFoot}>
              {editing.id ? (
                <Button variant="text" tone="danger" disabled={busy} onClick={() => remove(editing.id!, editing.name)}>
                  Delete
                </Button>
              ) : null}
              <span className={styles.spacer} />
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name.trim() || busy} onClick={save}>
                {busy ? "Saving…" : "Save topic"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
