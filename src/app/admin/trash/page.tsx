"use client";

import { useCallback, useEffect, useState } from "react";

type TrashWriteup = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
};

export default function AdminTrashPage() {
  const [writeups, setWriteups] = useState<TrashWriteup[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/trash", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setWriteups(data.writeups ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const act = async (action: "restore" | "purge", id: string, title: string) => {
    if (action === "purge" && !confirm(`Permanently delete "${title}"? This cannot be undone.`)) {
      return;
    }

    const res = await fetch("/api/admin/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, type: "writeup", id }),
    });

    if (res.ok) {
      showAlert("success", action === "restore" ? "Restored." : "Permanently deleted.");
      load();
    } else {
      const data = await res.json();
      showAlert("error", data.error || "Action failed.");
    }
  };

  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const empty = !loading && writeups.length === 0;

  return (
    <div className="admin-shell">
      <main className="admin-main">
        {alert && (
          <div className={`admin-alert admin-alert-${alert.type}`}>{alert.msg}</div>
        )}

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Trash</h1>
            <p className="admin-page-subtitle">
              Restore soft-deleted writeups or remove them permanently.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : empty ? (
          <div className="admin-card admin-empty">
            <h3>Trash is empty</h3>
            <p>Deleted writeups appear here.</p>
          </div>
        ) : (
          <div className="admin-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Deleted</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {writeups.map((w) => (
                    <tr key={w.id}>
                      <td>{w.title}</td>
                      <td className="text-muted">{w.category || "—"}</td>
                      <td className="text-muted text-small">{fmt(w.updated_at)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ marginRight: 8 }}
                          onClick={() => act("restore", w.id, w.title)}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => act("purge", w.id, w.title)}
                        >
                          Delete forever
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
