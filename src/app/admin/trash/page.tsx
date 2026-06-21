"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";

type TrashWriteup = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
};

type TrashProject = {
  id: string;
  title: string;
  slug: string;
  updated_at: string;
};

export default function AdminTrashPage() {
  const [writeups, setWriteups] = useState<TrashWriteup[]>([]);
  const [projects, setProjects] = useState<TrashProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/trash", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setWriteups(data.writeups ?? []);
      setProjects(data.projects ?? []);
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

  const act = async (
    action: "restore" | "purge",
    type: "writeup" | "project",
    id: string,
    title: string,
  ) => {
    if (action === "purge" && !confirm(`Permanently delete "${title}"? This cannot be undone.`)) {
      return;
    }

    const res = await fetch("/api/admin/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, type, id }),
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

  const empty = !loading && writeups.length === 0 && projects.length === 0;

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        {alert && (
          <div className={`admin-alert admin-alert-${alert.type}`}>{alert.msg}</div>
        )}

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Trash</h1>
            <p className="admin-page-subtitle">
              Restore soft-deleted items or remove them permanently.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : empty ? (
          <div className="admin-card admin-empty">
            <h3>Trash is empty</h3>
            <p>Deleted writeups and projects appear here.</p>
          </div>
        ) : (
          <>
            {writeups.length > 0 && (
              <div className="admin-card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, marginBottom: 16 }}>Writeups</h2>
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
                              onClick={() => act("restore", "writeup", w.id, w.title)}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => act("purge", "writeup", w.id, w.title)}
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

            {projects.length > 0 && (
              <div className="admin-card">
                <h2 style={{ fontSize: 16, marginBottom: 16 }}>Projects</h2>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Deleted</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id}>
                          <td>{p.title}</td>
                          <td className="text-muted text-small">{fmt(p.updated_at)}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: 8 }}
                              onClick={() => act("restore", "project", p.id, p.title)}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => act("purge", "project", p.id, p.title)}
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
          </>
        )}
      </main>
    </div>
  );
}
