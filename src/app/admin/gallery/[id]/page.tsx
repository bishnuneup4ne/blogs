"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, useApiCollection, type ApiAlbum, type ApiPhoto } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "@/components/admin/Dialog";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { detectExternalVideo } from "@/lib/external-video";
import styles from "./folder.module.scss";

type Filter = "all" | "image" | "video";

export default function AdminFolderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const id = decodeURIComponent(String(params?.id ?? ""));

  const albumsC = useApiCollection<ApiAlbum>("/api/admin/albums", "albums");
  const album = useMemo(() => albumsC.items.find((a) => a.id === id || a.slug === id), [albumsC.items, id]);

  const photosC = useApiCollection<ApiPhoto>(`/api/admin/photos?album=${id}`, "photos");
  const [filter, setFilter] = useState<Filter>("all");
  const [meta, setMeta] = useState({ caption: "", taken_at: "" });
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCount = useRef(0);

  const shown = useMemo(
    () => photosC.items.filter((p) => (filter === "all" ? true : filter === "video" ? p.kind === "video" : p.kind !== "video")),
    [photosC.items, filter],
  );
  const counts = useMemo(() => {
    const images = photosC.items.filter((p) => p.kind !== "video").length;
    return { all: photosC.items.length, image: images, video: photosC.items.length - images };
  }, [photosC.items]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const media = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      if (!media.length) {
        toast("Only images (JPEG/PNG/WebP/GIF) and videos (MP4/WebM) can be added.", "error");
        return;
      }
      uploadCount.current += media.length;
      setUploading(uploadCount.current);
      for (const file of media) {
        try {
          const { src, kind } = await api.upload(file);
          await api.post("/api/admin/photos", {
            album_id: id,
            src,
            kind: kind ?? "image",
            poster_url: "",
            caption: meta.caption,
            alt: meta.caption,
            taken_at: meta.taken_at || null,
            width: 1400,
            height: kind === "video" ? 788 : 933,
            camera: "",
            position: photosC.items.length,
          });
          setMeta({ caption: "", taken_at: "" });
          photosC.reload();
          albumsC.reload();
        } catch (e) {
          toast(e instanceof Error ? e.message : `Could not upload ${file.name}`, "error");
        } finally {
          uploadCount.current -= 1;
          setUploading(uploadCount.current);
        }
      }
      toast(`${media.length} item${media.length > 1 ? "s" : ""} added`, "success");
    },
    [id, meta, photosC, albumsC, toast],
  );

  async function patchPhoto(photoId: string, patch: Partial<ApiPhoto> & { cover?: boolean }) {
    try {
      await api.patch(`/api/admin/photos/${photoId}`, patch);
      photosC.reload();
      if (patch.cover) albumsC.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", "error");
    }
  }

  async function removePhoto(photo: ApiPhoto) {
    const ok = await confirm({ title: "Remove item", body: "Remove this from the folder?", confirmLabel: "Remove" });
    if (!ok) return;
    try {
      await api.del(`/api/admin/photos/${photo.id}`);
      toast("Removed", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/photos", {
              album_id: photo.album_id,
              src: photo.src,
              kind: photo.kind ?? "image",
              poster_url: photo.poster_url ?? "",
              caption: photo.caption,
              alt: photo.alt,
              taken_at: photo.taken_at,
              width: photo.width,
              height: photo.height,
              camera: photo.camera,
              position: photo.position,
            });
            photosC.reload();
            toast("Restored", "success");
          } catch {
            toast("Could not restore", "error");
          }
        },
      });
      photosC.reload();
      albumsC.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove", "error");
    }
  }

  async function move(photo: ApiPhoto, dir: -1 | 1) {
    const idx = photosC.items.findIndex((x) => x.id === photo.id);
    const other = photosC.items[idx + dir];
    if (!other) return;
    await Promise.all([
      api.patch(`/api/admin/photos/${photo.id}`, { position: other.position }),
      api.patch(`/api/admin/photos/${other.id}`, { position: photo.position }),
    ]);
    photosC.reload();
  }

  if (albumsC.loading) return <p className={styles.muted}>Loading folder…</p>;
  if (!album) {
    return (
      <div>
        <p>Folder not found.</p>
        <Link href="/admin/gallery" className="btn btn-outline">Back to folders</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/admin/gallery">Gallery</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{album.title}</span>
      </nav>

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>{album.title}</h1>
          <p className={styles.sub}>
            {counts.image} photo{counts.image === 1 ? "" : "s"} · {counts.video} video{counts.video === 1 ? "" : "s"} · {album.year}
          </p>
          {album.description ? <p className={styles.desc}>{album.description}</p> : null}
        </div>
        <div className={styles.headActions}>
          <Button variant="outlined" onClick={() => router.push("/admin/gallery")}>All folders</Button>
          <Link href={`/gallery/${album.slug}`} target="_blank" rel="noreferrer noopener" className="btn btn-ghost">View on site ↗</Link>
        </div>
      </header>

      <section
        className={dragOver ? `${styles.dropzone} ${styles.dropzoneActive}` : styles.dropzone}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple hidden onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <div className={styles.dropRow}>
          <button type="button" className={styles.dropBox} onClick={() => fileInputRef.current?.click()} disabled={uploading > 0}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <strong>{uploading > 0 ? `Uploading ${uploading}…` : "Drop photos or videos here"}</strong>
            <em>or click to browse — JPEG, PNG, WebP, GIF, MP4, WebM</em>
          </button>
          <button type="button" className={styles.linkBox} onClick={() => setLinkOpen(true)}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M10 13.5a4 4 0 0 0 5.7.4l2.6-2.6a4 4 0 1 0-5.7-5.7L11.4 6.8" />
              <path d="M14 10.5a4 4 0 0 0-5.7-.4l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.2-1.2" />
            </svg>
            <strong>Add video by link</strong>
            <em>YouTube or Vimeo URL</em>
          </button>
        </div>
        <div className={styles.metaRow}>
          <input placeholder="Title for the next upload (optional)" value={meta.caption} onChange={(e) => setMeta((m) => ({ ...m, caption: e.target.value }))} />
          <input type="date" aria-label="Date for the next upload" value={meta.taken_at} onChange={(e) => setMeta((m) => ({ ...m, taken_at: e.target.value }))} />
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter items">
          {(["all", "image", "video"] as const).map((f) => (
            <button key={f} type="button" className={filter === f ? styles.filterActive : styles.filter} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {f === "all" ? `All (${counts.all})` : f === "image" ? `Photos (${counts.image})` : `Videos (${counts.video})`}
            </button>
          ))}
        </div>
        <p className={styles.coverHint}>
          Folder cover:{" "}
          {album.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.cover_url} alt="Current cover" className={styles.coverChip} />
          ) : (
            <em>none yet — tap “Cover” on any photo</em>
          )}
        </p>
      </div>

      {photosC.loading ? <p className={styles.muted}>Loading items…</p> : null}
      {!photosC.loading && shown.length === 0 ? (
        <p className={styles.muted}>{filter === "all" ? "This folder is empty — drop your first photo above." : `No ${filter}s in this folder yet.`}</p>
      ) : null}

      <ul className={styles.grid}>
        {shown.map((ph, i) => {
          const isCover = ph.kind !== "video" && Boolean(album.cover_url) && album.cover_url === ph.src;
          return (
          <li key={ph.id} className={styles.item}>
            <div className={styles.thumbWrap}>
              {ph.kind === "video" ? (
                ph.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ph.poster_url} alt="" className={styles.thumb} loading="lazy" />
                ) : (
                  <span className={styles.videoBadge} aria-hidden="true">▶</span>
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ph.src} alt="" className={styles.thumb} loading="lazy" />
              )}
              {ph.kind === "video" ? <span className={styles.videoTag}>Video</span> : null}
              <span className={styles.pos}>{photosC.items.indexOf(ph) + 1}</span>
            </div>
            <div className={styles.itemForm}>
              <input
                defaultValue={ph.caption}
                placeholder="Title"
                aria-label={`Title for item ${i + 1}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== ph.caption) void patchPhoto(ph.id, { caption: v, alt: v });
                }}
              />
              <input
                type="date"
                value={ph.taken_at ?? ""}
                aria-label={`Date for item ${i + 1}`}
                onChange={(e) => void patchPhoto(ph.id, { taken_at: e.target.value })}
              />
              <div className={styles.itemActions}>
                <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={i === 0} onClick={() => void move(ph, -1)}>↑</button>
                <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={i === shown.length - 1} onClick={() => void move(ph, 1)}>↓</button>
                {ph.kind !== "video" ? (
                  <button
                    type="button"
                    className={isCover ? `${styles.coverBtn} ${styles.coverBtnActive}` : styles.coverBtn}
                    aria-pressed={isCover}
                    onClick={() => void patchPhoto(ph.id, { cover: true }).then(() => toast("Cover updated", "success"))}
                  >
                    {isCover ? "✓ Cover" : "Cover"}
                  </button>
                ) : null}
                <button type="button" className={styles.removeBtn} aria-label="Remove item" onClick={() => void removePhoto(ph)}>×</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {linkOpen ? <VideoLinkDialog albumId={id} onClose={() => setLinkOpen(false)} onAdded={() => { photosC.reload(); albumsC.reload(); }} /> : null}
    </div>
  );
}

function VideoLinkDialog({ albumId, onClose, onAdded }: { albumId: string; onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [busy, setBusy] = useState(false);
  const detected = detectExternalVideo(url);

  async function add() {
    if (!detected) return;
    setBusy(true);
    try {
      await api.post("/api/admin/photos", {
        album_id: albumId,
        url: detected.url,
        caption,
        alt: caption,
        taken_at: takenAt || null,
        width: 1280,
        height: 720,
        poster_url: detected.thumbnail,
      });
      toast("Video added", "success");
      onAdded();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add video", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      variant="modal"
      title="Add video by link"
      onClose={onClose}
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button disabled={!detected || busy} onClick={add}>{busy ? "Adding…" : "Add video"}</Button>
        </>
      }
    >
      <label>
        <span>YouTube or Vimeo URL</span>
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        {url.trim() && !detected ? <span className={styles.fieldError}>Not a recognised YouTube/Vimeo link yet.</span> : null}
      </label>
      {detected ? (
        <div className={styles.previewRow}>
          {detected.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detected.thumbnail} alt="" className={styles.previewThumb} />
          ) : null}
          <span>
            <strong>{detected.kind === "youtube" ? "YouTube" : "Vimeo"} video detected</strong>
            <em>{url.slice(0, 60)}</em>
          </span>
        </div>
      ) : null}
      <label><span>Title (optional)</span><input value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
      <label><span>Date (optional)</span><input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} /></label>
    </AdminDialog>
  );
}
