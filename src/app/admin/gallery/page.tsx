"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum, type ApiPhoto } from "@/components/admin/api";
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

export default function AdminGalleryPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const albumsC = useApiCollection<ApiAlbum>("/api/admin/albums", "albums");
  const [editing, setEditing] = useState<AlbumDraft | null>(null);
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
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

  return (
    <div>
      <PageHeader
        title="Gallery folders"
        description="Each folder is a collection with a name, description and date. Open one to add photos."
        actions={
          <Button onClick={() => setEditing({ title: "", slug: "", subtitle: "", description: "", year: new Date().getFullYear(), cover_url: "", sort_order: albumsC.items.length + 1 })}>
            New folder
          </Button>
        }
      />
      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {albumsC.loading ? <p className={styles.emptyNote}>Loading folders…</p> : null}
      {albumsC.error ? <p role="alert" className={styles.formError}>Could not load folders: {albumsC.error}</p> : null}
      {!albumsC.loading && !albumsC.error && albumsC.items.length === 0 ? (
        <p className={styles.emptyNote}>No gallery folders yet. Create one to start adding photos.</p>
      ) : null}

      <div className={styles.grid}>
        {albumsC.items.map((album) => (
          <article key={album.id} className={styles.card}>
            <button type="button" className={styles.folderHead} onClick={() => setOpenAlbum(openAlbum === album.id ? null : album.id)}>
              {album.first_photo || album.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={album.cover_url || album.first_photo} alt="" className={styles.folderCover} width={52} height={52} />
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6c.5 0 .9.2 1.2.6l1 1.4h7.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5Z" />
                </svg>
              )}
              <span>
                <strong>{album.title}</strong>
                <em>{album.photo_count ?? 0} photos · {album.year}</em>
              </span>
            </button>
            <p className={styles.desc}>{album.subtitle || album.description}</p>
            <div className={styles.rowActions}>
              <Button size="sm" variant="outlined" onClick={() => setEditing({ id: album.id, title: album.title, slug: album.slug, subtitle: album.subtitle, description: album.description, year: album.year, cover_url: album.cover_url, sort_order: album.sort_order })}>
                Edit details
              </Button>
              <Link href={`/gallery/${album.slug}`} target="_blank" rel="noreferrer noopener" className="btn btn-ghost">View</Link>
              <Button size="sm" variant="text" tone="danger" onClick={() => deleteAlbum(album.id, { title: album.title, slug: album.slug, subtitle: album.subtitle, description: album.description, year: album.year, cover_url: album.cover_url, sort_order: album.sort_order })}>Delete</Button>
            </div>
            {openAlbum === album.id ? <PhotosPanel albumId={album.id} onChanged={albumsC.reload} /> : null}
          </article>
        ))}
      </div>

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

function PhotosPanel({ albumId, onChanged }: { albumId: string; onChanged: () => void }) {
  const toast = useToast();
  const photosC = useApiCollection<ApiPhoto>(`/api/admin/photos?album=${albumId}`, "photos");
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<{ caption: string; taken_at: string }>({ caption: "", taken_at: "" });

  async function upload(file: File, poster?: File) {
    setUploading(true);
    try {
      const { src, kind } = await api.upload(file);
      const posterSrc = kind === "video" && poster ? (await api.upload(poster)).src : "";
      await api.post("/api/admin/photos", {
        album_id: albumId,
        src,
        kind: kind ?? "image",
        poster_url: posterSrc,
        caption: meta.caption,
        alt: meta.caption,
        taken_at: meta.taken_at || null,
      });
      setMeta({ caption: "", taken_at: "" });
      photosC.reload();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function patchPhoto(id: string, patch: Partial<ApiPhoto>) {
    try {
      await api.patch(`/api/admin/photos/${id}`, patch);
      photosC.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save photo");
    }
  }

  return (
    <div className={styles.photos}>
      <div className={styles.addRow}>
        <input placeholder="Title" value={meta.caption} onChange={(e) => setMeta({ ...meta, caption: e.target.value })} />
        <input type="date" value={meta.taken_at} onChange={(e) => setMeta({ ...meta, taken_at: e.target.value })} />
        <label className="btn btn-outline">
          {uploading ? "Uploading…" : "Add photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
          />
        </label>
        <label className="btn btn-outline">
          {uploading ? "Uploading…" : "Add video"}
          <input
            type="file"
            accept="video/mp4,video/webm"
            hidden
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
          />
        </label>
      </div>
      {photosC.loading ? <p className={styles.desc}>Loading photos…</p> : null}
      {photosC.error ? <p role="alert" className={styles.formError}>Could not load photos: {photosC.error}</p> : null}
      {!photosC.loading && !photosC.error && photosC.items.length === 0 ? (
        <p className={styles.desc}>No photos in this folder yet.</p>
      ) : null}
      <ul className={styles.photoList}>
        {photosC.items.map((ph) => (
          <PhotoRow
            key={ph.id}
            photo={ph}
            onPatch={patchPhoto}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </div>
  );
}

function PhotoRow({ photo, onPatch, onChanged }: { photo: ApiPhoto; onPatch: (id: string, patch: Partial<ApiPhoto>) => Promise<void>; onChanged: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [caption, setCaption] = useState(photo.caption);
  const [takenAt, setTakenAt] = useState(photo.taken_at ?? "");

  async function remove() {
    const ok = await confirm({ title: "Remove photo", body: "Remove this photo from the folder? It can be restored from the toast.", confirmLabel: "Remove photo" });
    if (!ok) return;
    const snap = { ...photo };
    try {
      await api.del(`/api/admin/photos/${photo.id}`);
      toast("Photo removed", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/photos", {
              album_id: snap.album_id,
              src: snap.src,
              kind: snap.kind ?? "image",
              poster_url: snap.poster_url ?? "",
              caption: snap.caption,
              alt: snap.alt,
              taken_at: snap.taken_at,
              width: snap.width,
              height: snap.height,
              camera: snap.camera,
              position: snap.position,
              cover_too: true,
            });
            toast("Photo restored", "success");
            onChanged();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore photo");
          }
        },
      });
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove photo");
    }
  }

  return (
    <li>
      {photo.kind === "video" ? (
        <video src={photo.src} muted playsInline preload="metadata" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8 }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt="" />
      )}
      <input
        value={caption}
        aria-label="Photo caption"
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => {
          const value = caption.trim();
          if (value !== photo.caption) onPatch(photo.id, { caption: value, alt: value });
        }}
      />
      <input
        type="date"
        aria-label="Date taken"
        value={takenAt}
        onChange={(e) => {
          setTakenAt(e.target.value);
          onPatch(photo.id, { taken_at: e.target.value });
        }}
      />
      <button type="button" aria-label="Remove photo" onClick={remove}>×</button>
    </li>
  );
}
