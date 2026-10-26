"use client";

import { useMemo, useState } from "react";
import { api, useApiCollection, type ApiPhoto, type ApiPost, type ApiUpload } from "@/components/admin/api";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { PageHeader, Segmented } from "@/components/admin/kit";
import styles from "./media.module.scss";

export default function AdminMediaPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const photosC = useApiCollection<ApiPhoto>("/api/admin/photos", "photos");
  const postsC = useApiCollection<ApiPost>("/api/admin/posts", "posts");
  const uploadsC = useApiCollection<ApiUpload>("/api/admin/upload", "files");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const state = { posts: postsC.items.map((p) => ({ cover: p.cover_url })) };
  const [tab, setTab] = useState<"all" | "gallery" | "uploads">("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function removeUpload(name: string) {
    const ok = await confirm({
      title: "Delete file",
      body: `Delete “${name}” from storage? Existing post references will break.`,
      confirmLabel: "Delete file",
    });
    if (!ok) return;
    setDeleting(name);
    setUploadError("");
    try {
      await api.del(`/api/admin/upload?name=${encodeURIComponent(name)}`);
      toast("File deleted", "success");
      await uploadsC.reload();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const items = useMemo(() => {
    const gallery = photosC.items.map((ph) => ({
      src: ph.src,
      name: ph.src.split("/").pop() ?? ph.src,
      type: ph.src.endsWith(".png") ? "image/png" : ph.src.endsWith(".webp") ? "image/webp" : "image/jpeg",
      size: "",
      added: ph.taken_at ?? "",
      kind: "gallery" as const,
      usedBy: state.posts.filter((p) => p.cover === ph.src).length,
    })).filter((item, index, all) => all.findIndex((x) => x.src === item.src) === index);
    const uploads = uploadsC.items.map((file) => ({
      src: file.src,
      name: file.name,
      type: file.type,
      size: file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "",
      added: file.created_at.slice(0, 10),
      kind: "uploads" as const,
      usedBy: state.posts.filter((p) => p.cover === file.src).length,
    }));
    const all = [...gallery, ...uploads];
    const q = query.trim().toLowerCase();
    return all
      .filter((i) => (tab === "all" ? true : i.kind === tab))
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true));
  }, [state.posts, tab, query, photosC.items, uploadsC.items]);

  return (
    <div>
      <PageHeader
        title="Media"
        description="Every image the blog can use. Gallery photos come from albums; uploads are files you have added here."
        actions={
          <label className={styles.upload}>
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                setUploading(true);
                setUploadError("");
                try {
                  for (const f of files) await api.upload(f);
                  await uploadsC.reload();
                } catch (err) {
                  setUploadError(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        }
      />

      {uploadError ? <p role="alert" className={styles.formError}>{uploadError}</p> : null}
      {photosC.error || uploadsC.error ? (
        <p role="alert" className={styles.formError}>
          Could not load media: {photosC.error || uploadsC.error}
        </p>
      ) : null}

      <div className={styles.toolbar}>
        <Segmented
          label="Media type"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All" },
            { value: "gallery", label: "Gallery" },
            { value: "uploads", label: "Uploads" },
          ]}
        />
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files"
          aria-label="Search media"
        />
      </div>

      {photosC.loading || uploadsC.loading ? (
        <p className={styles.emptyNote}>Loading media…</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyNote}>No media matches this view.</p>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <figure key={item.src} className={styles.tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt="" className={styles.img} />
              <figcaption className={styles.meta}>
                <p className={styles.name}>{item.name}</p>
                <p className={styles.sub}>
                  {item.type.split("/")[1].toUpperCase()} · {item.size} · {item.usedBy > 0 ? `${item.usedBy} post${item.usedBy > 1 ? "s" : ""}` : "unused"}
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.copy}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item.src);
                        setCopied(item.src);
                        setTimeout(() => setCopied(null), 1400);
                      } catch {}
                    }}
                  >
                    {copied === item.src ? "Copied path" : "Copy path"}
                  </button>
                  {item.kind === "uploads" ? (
                    <button
                      type="button"
                      className={styles.delete}
                      disabled={deleting === item.name}
                      onClick={() => void removeUpload(item.name)}
                    >
                      {deleting === item.name ? "Deleting…" : "Delete"}
                    </button>
                  ) : null}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
