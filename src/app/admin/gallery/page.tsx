"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AdminImage } from "@/components/admin/AdminImage";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

interface GalleryImage {
  src: string;
  alt: string;
  orientation: "horizontal" | "vertical";
}

const emptyNew: GalleryImage = { src: "", alt: "", orientation: "horizontal" };

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<GalleryImage>(emptyNew);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFullConfig(data);
        const galleryImages = (data.gallery as { images?: GalleryImage[] })?.images;
        if (galleryImages?.length) {
          setImages(
            galleryImages.map((img) => ({
              ...img,
              src: normalizeImageUrl(img.src),
            })),
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const saveImages = async (newImages: GalleryImage[]) => {
    if (!fullConfig) return;
    setSaving(true);
    try {
      const normalized = newImages.map((img) => ({
        ...img,
        src: normalizeImageUrl(img.src),
      }));
      const updatedConfig = {
        ...fullConfig,
        gallery: {
          ...(fullConfig.gallery as object),
          images: normalized,
        },
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        setImages(normalized);
        setFullConfig(updatedConfig);
        showAlert("success", "Gallery saved.");
      } else {
        showAlert("error", "Failed to save gallery.");
      }
    } catch {
      showAlert("error", "Network error while saving.");
    }
    setSaving(false);
  };

  const handleAddImage = () => {
    const src = normalizeImageUrl(newImage.src);
    if (!src) {
      showAlert("error", "Upload an image or paste a URL first.");
      return;
    }
    saveImages([...images, { ...newImage, src }]);
    setNewImage(emptyNew);
  };

  const handleRemoveImage = (index: number) => {
    if (confirm("Remove this image from the gallery?")) {
      const updated = [...images];
      updated.splice(index, 1);
      saveImages(updated);
    }
  };

  const previewSrc = normalizeImageUrl(newImage.src);

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        {alert && (
          <div className={`admin-alert admin-alert-${alert.type}`}>{alert.msg}</div>
        )}

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Gallery</h1>
            <p className="admin-page-subtitle">
              Images appear on the public Gallery page.
            </p>
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Add new image</h2>

          <div className="admin-form">
            <div className="form-field">
              <label className="form-label">Upload or URL</label>
              <ImageUploader
                onUploadSuccess={(url) =>
                  setNewImage((prev) => ({ ...prev, src: normalizeImageUrl(url) }))
                }
              />
              <input
                className="form-input form-input-mono"
                placeholder="https://…"
                value={newImage.src}
                onChange={(e) =>
                  setNewImage((prev) => ({ ...prev, src: e.target.value }))
                }
                onBlur={(e) =>
                  setNewImage((prev) => ({
                    ...prev,
                    src: normalizeImageUrl(e.target.value),
                  }))
                }
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Alt text</label>
                <input
                  className="form-input"
                  placeholder="Describe the image…"
                  value={newImage.alt}
                  onChange={(e) =>
                    setNewImage((prev) => ({ ...prev, alt: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label">Orientation</label>
                <select
                  className="form-select"
                  value={newImage.orientation}
                  onChange={(e) =>
                    setNewImage((prev) => ({
                      ...prev,
                      orientation: e.target.value as "horizontal" | "vertical",
                    }))
                  }
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
            </div>

            {previewSrc && (
              <div className="admin-gallery-preview">
                <p className="form-label" style={{ textTransform: "none", marginBottom: 8 }}>
                  Preview
                </p>
                <AdminImage
                  src={previewSrc}
                  alt="Preview"
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    borderRadius: 8,
                    display: "block",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddImage}
                disabled={saving || loading || !previewSrc}
              >
                Add image
              </button>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Current images</h2>
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : images.length === 0 ? (
            <p className="text-muted">No gallery images yet.</p>
          ) : (
            <div className="admin-gallery-grid">
              {images.map((img, i) => (
                <div key={`${img.src}-${i}`} className="admin-gallery-tile">
                  <AdminImage
                    src={img.src}
                    alt={img.alt}
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div className="admin-gallery-tile-meta">
                    <p>{img.alt || "No alt text"}</p>
                    <span>{img.orientation}</span>
                  </div>
                  <button
                    type="button"
                    className="admin-gallery-remove"
                    onClick={() => handleRemoveImage(i)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
