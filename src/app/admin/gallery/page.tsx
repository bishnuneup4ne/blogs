"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "@/components/admin/Dialog";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { PageHeader } from "@/components/admin/kit";
import styles from "./gallery.module.scss";

interface AlbumDraft {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  year: number;
  cover_url: string;
  sort_order: number;
}

const EMPTY_DRAFT = (sortOrder: number): AlbumDraft => ({
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  year: new Date().getFullYear(),
  cover_url: "",
  sort_order: sortOrder,
});

export default function AdminGalleryPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const albumsC = useApiCollection<ApiAlbum>("/api/admin/albums", "albums");
  const [editing, setEditing] = useState<AlbumDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveAlbum() {
    if (!editing || !editing.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...editing, slug: editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") };
      if (editing.id) await api.patch(`/api/admin/albums/${editing.id}`, payload);
      else await api.post("/api/admin/albums", payload);
      setEditing(null);
      toast("Folder saved", "success");
      albumsC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAlbum(id: string, snapshot: Required<Pick<AlbumDraft, "title" | "slug" | "subtitle" | "description" | "year" | "cover_url" | "sort_order">>) {
    const ok = await confirm({
      title: "Delete folder",
      body: `Delete folder “${snapshot.title}” and all its photos?`,
      confirmLabel: "Delete folder",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/albums/${id}`);
      toast("Folder deleted", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/albums", snapshot);
            albumsC.reload();
            router.refresh();
            toast("Folder restored", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore folder");
          }
        },
      });
      albumsC.reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const totalFrames = albumsC.items.reduce((n, a) => n + (a.photo_count ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Gallery folders"
        description={
          albumsC.items.length
            ? `${albumsC.items.length} ${albumsC.items.length === 1 ? "folder" : "folders"} · ${totalFrames} frames. Open one to add photos and videos.`
            : "Each folder is a collection with a name, description and date. Open one to add photos and videos."
        }
        actions={
          <Button onClick={() => setEditing(EMPTY_DRAFT(albumsC.items.length + 1))}>New folder</Button>
        }
      />
      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {albumsC.loading ? <p className={styles.emptyNote}>Loading folders…</p> : null}
      {albumsC.error ? <p role="alert" className={styles.formError}>Could not load folders: {albumsC.error}</p> : null}
      {!albumsC.loading && !albumsC.error && albumsC.items.length === 0 ? (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6c.5 0 .9.2 1.2.6l1 1.4h7.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5Z" />
          </svg>
          <p>No gallery folders yet.</p>
          <em>Create one to start collecting frames.</em>
        </div>
      ) : null}

      <ul className={styles.grid}>
        {albumsC.items.map((album) => {
          const cover = album.cover_url || album.first_photo || "";
          return (
            <li key={album.id}>
              <Link href={`/admin/gallery/${album.id}`} className={styles.card}>
                <span className={cover ? styles.bannerWithCover : styles.banner}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className={styles.bannerImg} loading="lazy" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6c.5 0 .9.2 1.2.6l1 1.4h7.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5Z" />
                    </svg>
                  )}
                  <span className={styles.countPill}>{album.photo_count ?? 0}</span>
                </span>
                <span className={styles.body}>
                  <span className={styles.headRow}>
                    <strong className={styles.name}>{album.title}</strong>
                    <span className={styles.year}>{album.year}</span>
                  </span>
                  <span className={styles.meta}>
                    {album.photo_count ?? 0} photos{album.video_count ? ` · ${album.video_count} videos` : ""}
                  </span>
                  {album.subtitle || album.description ? (
                    <span className={styles.desc}>{album.subtitle || album.description}</span>
                  ) : null}
                </span>
              </Link>
              <div className={styles.rowActions}>
                <Button size="sm" variant="outlined" onClick={() => setEditing({ id: album.id, title: album.title, slug: album.slug, subtitle: album.subtitle, description: album.description, year: album.year, cover_url: album.cover_url, sort_order: album.sort_order })}>
                  Edit details
                </Button>
                <Link href={`/gallery/${album.slug}`} target="_blank" rel="noreferrer noopener" className="btn btn-ghost">View on site</Link>
                <Button size="sm" variant="text" tone="danger" onClick={() => deleteAlbum(album.id, { title: album.title, slug: album.slug, subtitle: album.subtitle, description: album.description, year: album.year, cover_url: album.cover_url, sort_order: album.sort_order })}>Delete</Button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing ? (
        <AdminDialog
          variant="modal"
          title={editing.id ? "Edit folder" : "New folder"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={!editing.title.trim() || busy} onClick={saveAlbum}>{busy ? "Saving…" : "Save folder"}</Button>
            </>
          }
        >
          <label>
            <span>Name</span>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            {!editing.title.trim() ? <span className={styles.fieldError}>A name is required.</span> : null}
          </label>
          <label><span>Slug</span><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></label>
          <label><span>Subtitle</span><input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></label>
          <label><span>Description</span><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <label><span>Date / year</span><input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} /></label>
          <label><span>Cover URL (optional)</span><input value={editing.cover_url} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} /></label>
        </AdminDialog>
      ) : null}
    </div>
  );
}
