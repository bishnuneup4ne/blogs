"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";

export default function SettingsPage() {
  const [configJson, setConfigJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setConfigJson(JSON.stringify(data, null, 2));
        } else {
          const err = await res.json();
          setMessage(`Failed to load: ${err.error || res.statusText}`);
        }
      } catch (err) {
        console.error("Failed to load config", err);
        setMessage("Failed to load configuration.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const parsed = JSON.parse(configJson);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        setMessage("Settings saved successfully! Changes will appear immediately on the site.");
      } else {
        const err = await res.json();
        setMessage(`Error saving: ${err.error}`);
      }
    } catch (e: unknown) {
      setMessage(`Invalid JSON format: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Site Configuration</h1>
            <p className="admin-page-subtitle">
              Edit site JSON (person, home, blog, gallery, etc.). Use plain strings for headline/subline — not JSX objects.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`admin-alert ${message.startsWith("Error") || message.startsWith("Failed") ? "admin-alert-error" : "admin-alert-success"}`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading settings...</p>
        ) : (
          <>
            <div className="admin-card">
              <textarea
                className="form-textarea"
                style={{
                  width: "100%",
                  height: "600px",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "40px" }}>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
