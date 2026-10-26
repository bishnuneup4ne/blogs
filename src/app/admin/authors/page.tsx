"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAuthor } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { PageHeader } from "@/components/admin/kit";
import styles from "./authors.module.scss";

interface AuthorDraft {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string;
  short_bio: string;
  bio: string;
  sort_order: number;
}

export default function AdminAuthorsPage() {
  const router = useRouter();
  const authorsC = useApiCollection<ApiAuthor>("/api/admin/authors", "authors");
  const postsC = useApiCollection<{ id: string; author_id: string | null }>("/api/admin/posts", "posts");
  const state = {
    authors: authorsC.items.map((a) => ({ id: a.id, name: a.name, role: a.role, email: a.email, avatar: a.avatar_url, bio: a.bio })),
    posts: postsC.items.map((p) => ({ authorId: p.author_id ?? "" })),
  };
  const [editing, setEditing] = useState<AuthorDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (state.authors.some((a) => a.id === editing.id)) await api.patch(`/api/admin/authors/${editing.id}`, editing);
      else await api.post("/api/admin/authors", editing);
      setEditing(null);
      authorsC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing?.id) return;
    const postCount = state.posts.filter((p) => p.authorId === editing.id).length;
    const suffix = postCount > 0 ? ` ${postCount} post${postCount === 1 ? "" : "s"} will be unassigned.` : "";
    if (!window.confirm(`Delete ${editing.name}?${suffix}`)) return;
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/admin/authors/${editing.id}`);
      setEditing(null);
      await authorsC.reload();
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
        title="Authors"
        description="Authors appear on posts and in the “About the Authors” block."
        actions={
          <Button
            onClick={() =>
              setEditing({ id: "", name: "", role: "", email: "", avatar_url: "/images/avatar.jpg", short_bio: "", bio: "", sort_order: state.authors.length + 1 })
            }
          >
            New author
          </Button>
        }
      />

      {authorsC.loading ? <p className={styles.emptyNote}>Loading authors…</p> : null}
      {authorsC.error ? <p role="alert" className={styles.formError}>Could not load authors: {authorsC.error}</p> : null}
      {!authorsC.loading && !authorsC.error && state.authors.length === 0 ? (
        <p className={styles.emptyNote}>No authors yet. Add one to start crediting posts.</p>
      ) : null}

      <div className={styles.grid}>
        {state.authors.map((author) => (
          <article key={author.id} className={styles.card}>
            <div className={styles.head}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={author.avatar} alt="" className={styles.avatar} />
              <div>
                <h2 className={styles.name}>{author.name}</h2>
                <p className={styles.role}>{author.role}</p>
              </div>
            </div>
            <p className={styles.bio}>{author.bio}</p>
            <div className={styles.foot}>
              <span>{state.posts.filter((p) => p.authorId === author.id).length} posts</span>
              <span className={styles.email}>{author.email}</span>
            </div>
            <Button
              size="sm"
              variant="outlined"
              onClick={() => {
                const current = authorsC.items.find((a) => a.id === author.id);
                if (current) setEditing({ ...current });
              }}
            >
              Edit profile
            </Button>
          </article>
        ))}
      </div>

      {editing ? (
        <div className={styles.drawerWrap} role="dialog" aria-modal="true" aria-label="Edit author">
          <div className={styles.drawer}>
            <h2 className={styles.drawerTitle}>{editing.id ? "Edit author" : "New author"}</h2>
            <label className={styles.field}>
              <span>Name</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Role</span>
              <input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Avatar URL</span>
              <input value={editing.avatar_url} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Short bio</span>
              <input value={editing.short_bio} onChange={(e) => setEditing({ ...editing, short_bio: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Bio</span>
              <textarea rows={5} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Order</span>
              <input
                type="number"
                min={0}
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              />
            </label>
            {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
            <div className={styles.drawerFoot}>
              {editing.id ? (
                <Button variant="text" tone="danger" disabled={busy} onClick={() => void remove()}>
                  Delete
                </Button>
              ) : null}
              <span className={styles.spacer} />
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.name.trim() || busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save author"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
