"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminSidebar } from "../AdminSidebar";

type WriteupRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  video_url?: string;
  created_at: string;
};

export default function AdminVideosPage() {
  const [items, setItems] = useState<WriteupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/writeups", { credentials: "include" });
    if (res.ok) {
      const data: WriteupRow[] = await res.json();
      setItems(data.filter((w) => w.video_url?.trim()));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Videos</h1>
            <p className="admin-page-subtitle">
              Personal videos shown on{" "}
              <Link href="/personal?tab=videos" target="_blank" rel="noreferrer">
                /personal → Videos
              </Link>
            </p>
          </div>
          <Link href="/admin/writeups/new?mode=video" className="btn btn-primary">
            + New video
          </Link>
        </div>

        <div className="admin-card">
          {loading ? (
            <p style={{ color: "#64748b" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No videos yet. Add a writeup with a YouTube/Vimeo URL — category should be{" "}
              <strong>Personal</strong> so it appears on the Personal → Videos tab. You can add an
              optional short description and markdown notes in the editor; they show in the video
              preview panel.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((w) => (
                    <tr key={w.id}>
                      <td>{w.title}</td>
                      <td>{w.category || "—"}</td>
                      <td>{w.status}</td>
                      <td>{fmt(w.created_at)}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/writeups/${w.id}/edit`}
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
