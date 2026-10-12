"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminSidebar } from "../AdminSidebar";

interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  summary: string;
  created_at: string;
  date: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/projects/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((p) => p.filter((x) => x.id !== deleteTarget.id));
      setAlert({ type: "success", msg: `"${deleteTarget.title}" deleted.` });
    } else {
      setAlert({ type: "error", msg: "Failed to delete." });
    }
    setDeleteTarget(null);
    setTimeout(() => setAlert(null), 4000);
  };

  const filtered = projects.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase()),
  );

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        {alert && (
          <div className={`admin-alert admin-alert-${alert.type}`}>
            {alert.type === "success" ? "✓" : "⚠"} {alert.msg}
          </div>
        )}

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Projects</h1>
            <p className="admin-page-subtitle">Manage portfolio / work items</p>
          </div>
          <Link href="/admin/projects/new" className="btn btn-primary">
            + New Project
          </Link>
        </div>

        <div className="admin-search">
          <input
            className="admin-search-input"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-card">
          {loading ? (
            <p style={{ color: "#64748b", padding: "24px" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#64748b", padding: "24px" }}>No projects yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>
                        /work/{p.slug}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${p.status === "Published" ? "published" : "draft"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{fmt(p.date || p.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Link href={`/admin/projects/${p.id}/edit`} className="btn btn-ghost btn-sm">
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {deleteTarget && (
          <div className="admin-modal-overlay">
            <div className="admin-modal">
              <h3>Delete project?</h3>
              <p>
                This will remove <strong>{deleteTarget.title}</strong>.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
