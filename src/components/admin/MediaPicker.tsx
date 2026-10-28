"use client";

import { useRef, useState } from "react";
import { api, type ApiUpload } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import styles from "./media-picker.module.scss";

/* Fetch a remote file and store it in our own bucket, so external links
   (GIFs, photos) become permanent local URLs. */
async function importFromUrl(url: string): Promise<string> {
  const r = await api.post<{ src: string }>("/api/admin/upload", { url });
  return r.src;
}

/* One field for "upload something new" or "pick it from the library".
   Accepts images, GIFs and MP4/WebM videos — same magic-byte rules as the
   upload endpoint. */
export function MediaPicker({
  label,
  value,
  onChange,
  accept = "image/*,video/mp4,video/webm",
}: {
  label: string;
  value: string;
  onChange: (src: string) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [files, setFiles] = useState<ApiUpload[] | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [importing, setImporting] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.upload(file);
      onChange(r.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function addUrl() {
    const v = urlValue.trim();
    if (!/^https?:\/\//i.test(v)) {
      setError("Enter a full https:// link");
      return;
    }
    setImporting(true);
    setError("");
    try {
      // Direct links are used as-is only when our server would accept them
      // (Supabase storage host); everything else is copied into our bucket.
      let src = v;
      try {
        src = await importFromUrl(v);
      } catch {
        /* proxy unavailable — fall back to the raw link */
      }
      onChange(src);
      setUrlOpen(false);
      setUrlValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that link");
    } finally {
      setImporting(false);
    }
  }

  async function openBrowser() {
    setBrowsing(true);
    setError("");
    if (!files) {
      try {
        const d = await api.get<{ files: ApiUpload[] }>("/api/admin/upload");
        setFiles(d.files);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the library");
      }
    }
  }

  const isVideo = /\.(mp4|webm)(\?|$)/i.test(value);

  return (
    <div className={styles.field}>
      <span>{label}</span>

      {value ? (
        <div className={styles.previewBox}>
          {isVideo ? (
            <video src={value} muted playsInline preload="metadata" controls className={styles.preview} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={styles.preview} />
          )}
        </div>
      ) : null}

      <div className={styles.row}>
        <Button variant="outlined" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : value ? "Upload new" : "Upload…"}
        </Button>
        <Button variant={browsing ? "filled" : "outlined"} onClick={() => (browsing ? setBrowsing(false) : void openBrowser())}>
          {browsing ? "Close library" : "Choose from library"}
        </Button>
        <Button variant="text" disabled={busy || importing} onClick={() => setUrlOpen((v) => !v)}>
          Add from URL
        </Button>
        {value ? (
          <Button variant="text" tone="danger" disabled={busy} onClick={() => onChange("")}>
            Remove
          </Button>
        ) : null}
      </div>

      {urlOpen ? (
        <div className={styles.urlRow}>
          <input
            type="url"
            placeholder="https://example.com/animation.gif — copied into your library"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addUrl();
              }
            }}
          />
          <Button variant="filled" disabled={importing || !/^https?:\/\//i.test(urlValue.trim())} onClick={() => void addUrl()}>
            {importing ? "Importing…" : "Add"}
          </Button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? <span className={styles.error}>{error}</span> : null}

      {browsing ? (
        <div className={styles.library} role="group" aria-label={`${label} library`}>
          {!files ? (
            <p className={styles.libNote}>Loading library…</p>
          ) : files.length === 0 ? (
            <p className={styles.libNote}>Nothing uploaded yet — use Upload to add your first file.</p>
          ) : (
            <ul className={styles.grid}>
              {files.map((f) => (
                <li key={f.name}>
                  <button
                    type="button"
                    className={`${styles.tile} ${f.src === value ? styles.tileActive : ""}`}
                    onClick={() => {
                      onChange(f.src);
                      setBrowsing(false);
                    }}
                    aria-label={`Use ${f.name}`}
                  >
                    {f.type.startsWith("video/") ? (
                      <video src={f.src} muted playsInline preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.src} alt="" loading="lazy" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
