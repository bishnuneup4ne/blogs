"use client";

import { useId, useRef, useState } from "react";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

type ImageUploaderProps = {
  onUploadSuccess?: (url: string) => void;
  compact?: boolean;
};

export function ImageUploader({ onUploadSuccess, compact }: ImageUploaderProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyUrl = (url: string) => {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return;
    setLastUrl(normalized);
    setError("");
    onUploadSuccess?.(normalized);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.url) {
        applyUrl(data.url);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: compact ? "flex-end" : "stretch" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", justifyContent: compact ? "flex-end" : "flex-start" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: "none" }}
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className="btn btn-ghost"
          style={{
            cursor: uploading ? "not-allowed" : "pointer",
            padding: "6px 12px",
            border: "1px dashed var(--neutral-border-strong)",
          }}
        >
          {uploading ? "Uploading…" : "📁 Upload to Supabase"}
        </label>
        {!compact && (
          <>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: "160px", fontSize: "12px" }}
              placeholder="Or paste image URL…"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUrl(pasteUrl);
                  setPasteUrl("");
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "6px 10px", fontSize: "12px" }}
              onClick={() => {
                applyUrl(pasteUrl);
                setPasteUrl("");
              }}
            >
              Use URL
            </button>
          </>
        )}
      </div>
      {error && <span style={{ color: "#f87171", fontSize: "12px" }}>{error}</span>}
      {lastUrl && (
        <span
          className="admin-upload-url-ok"
          style={{ fontSize: "11px", color: "#34d399", wordBreak: "break-all", maxWidth: "100%" }}
        >
          ✓ {lastUrl}
        </span>
      )}
    </div>
  );
}
