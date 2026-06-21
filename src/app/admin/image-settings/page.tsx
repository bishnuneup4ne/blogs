"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";

interface ImageSettings {
  darkThemeBackground: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  hoverScale: number;
  margin: string;
  imageBackground: string;
}

const DEFAULT_SETTINGS: ImageSettings = {
  darkThemeBackground: "white",
  borderRadius: "8px",
  padding: "0px",
  boxShadow: "none",
  hoverScale: 1.01,
  margin: "0px",
  imageBackground: "white",
};

export default function ImageSettingsPage() {
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/image-settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (err) {
      console.error("Failed to load image settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof ImageSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/image-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage("✓ Image settings saved successfully!");
        setTimeout(() => setMessage(""), 4000);
      } else {
        const err = await res.json();
        setMessage(`✗ Error: ${err.error || "Failed to save"}`);
      }
    } catch (err) {
      setMessage(`✗ Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset to default image settings?")) {
      setSettings(DEFAULT_SETTINGS);
      setMessage("Reset to defaults. Click Save to apply.");
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Image Styling</h1>
            <p className="admin-page-subtitle">Configure how images look on blog pages</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              ↻ Reset Defaults
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`admin-alert ${
              message.startsWith("✗") ? "admin-alert-error" : "admin-alert-success"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading settings...</p>
        ) : (
          <>
            <div className="admin-card">
              <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
                Dark Theme Container Styling
              </h2>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="bg-color" className="form-label">Background Color</label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <input
                      id="bg-color"
                      type="color"
                      value={settings.darkThemeBackground === "white" ? "#ffffff" : settings.darkThemeBackground}
                      onChange={(e) => handleChange("darkThemeBackground", e.target.value)}
                      style={{ width: "60px", height: "40px", cursor: "pointer", borderRadius: "6px" }}
                    />
                    <input
                      type="text"
                      value={settings.darkThemeBackground}
                      onChange={(e) => handleChange("darkThemeBackground", e.target.value)}
                      className="form-input"
                      placeholder="white, #ffffff, rgb(...)"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="border-radius" className="form-label">Border Radius</label>
                  <input
                    id="border-radius"
                    type="text"
                    value={settings.borderRadius}
                    onChange={(e) => handleChange("borderRadius", e.target.value)}
                    className="form-input"
                    placeholder="8px"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="padding" className="form-label">Padding</label>
                  <input
                    id="padding"
                    type="text"
                    value={settings.padding}
                    onChange={(e) => handleChange("padding", e.target.value)}
                    className="form-input"
                    placeholder="0px or 12px"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="margin" className="form-label">Margin</label>
                  <input
                    id="margin"
                    type="text"
                    value={settings.margin}
                    onChange={(e) => handleChange("margin", e.target.value)}
                    className="form-input"
                    placeholder="0px or 1rem"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="shadow" className="form-label">Box Shadow</label>
                  <input
                    id="shadow"
                    type="text"
                    value={settings.boxShadow}
                    onChange={(e) => handleChange("boxShadow", e.target.value)}
                    className="form-input"
                    placeholder="none or 0 4px 12px rgba(0,0,0,0.1)"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="hover-scale" className="form-label">Hover Scale</label>
                  <input
                    id="hover-scale"
                    type="number"
                    step="0.01"
                    min="0.9"
                    max="1.2"
                    value={settings.hoverScale}
                    onChange={(e) => handleChange("hoverScale", Number.parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="admin-card" style={{ marginTop: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
                Image Element Styling
              </h2>

              <div className="form-field">
                <label htmlFor="img-bg" className="form-label">Image Background Color</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input
                    id="img-bg"
                    type="color"
                    value={settings.imageBackground === "white" ? "#ffffff" : settings.imageBackground}
                    onChange={(e) => handleChange("imageBackground", e.target.value)}
                    style={{ width: "60px", height: "40px", cursor: "pointer", borderRadius: "6px" }}
                  />
                  <input
                    type="text"
                    value={settings.imageBackground}
                    onChange={(e) => handleChange("imageBackground", e.target.value)}
                    className="form-input"
                    placeholder="white, #ffffff"
                  />
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                  Background behind images (usually white to show transparent PNGs)
                </p>
              </div>
            </div>

            <div
              className="admin-card"
              style={{
                marginTop: "20px",
                background: `${settings.darkThemeBackground}`,
                padding: settings.padding,
                borderRadius: settings.borderRadius,
                boxShadow: settings.boxShadow,
                transition: "all 0.3s ease",
              }}
            >
              <h3 style={{ fontSize: "14px", color: "#333", marginBottom: "12px" }}>Live Preview</h3>
              <p style={{ fontSize: "12px", color: "#666" }}>
                This shows how images will look with your settings in dark mode.
              </p>
              <img
                src="https://placehold.co/400x250/e0e0e0/999?text=Sample+Image"
                alt="Preview"
                style={{
                  background: settings.imageBackground,
                  width: "100%",
                  maxWidth: "400px",
                  height: "auto",
                  borderRadius: "6px",
                  marginTop: "12px",
                }}
              />
            </div>

            <div style={{ paddingBottom: "40px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Saving..." : "💾 Save All Settings"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
