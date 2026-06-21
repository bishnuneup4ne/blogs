"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSidebar } from "../AdminSidebar";

type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (res.ok) {
        setCategories(await res.json());
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to load categories");
      }
    } catch {
      setMessage("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName("");
        setMessage(`Added "${data.name}" — it will appear in the site navbar.`);
        await load();
      } else {
        setMessage(data.error || "Failed to add category");
      }
    } catch {
      setMessage("Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? Writeups keep their category text.`)) return;

    setMessage("");
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setMessage(`Deleted "${cat.name}".`);
      await load();
    } else {
      const err = await res.json();
      setMessage(err.error || "Failed to delete");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const a = categories[index];
    const b = categories[target];

    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sort_order: b.sort_order }),
      }),
      fetch(`/api/admin/categories/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sort_order: a.sort_order }),
      }),
    ]);

    await load();
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Categories</h1>
            <p className="admin-page-subtitle">
              Categories shown in the site navbar. Assign them when creating writeups.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`admin-alert ${message.startsWith("Failed") ? "admin-alert-error" : "admin-alert-success"}`}
          >
            {message}
          </div>
        )}

        <div className="admin-card" style={{ marginBottom: "1.5rem" }}>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              className="form-input"
              style={{ flex: "1 1 200px" }}
              placeholder="New category name (e.g. CTF, Research, Personal)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={saving || !newName.trim()}>
              {saving ? "Adding…" : "Add category"}
            </button>
          </form>
        </div>

        <div className="admin-card">
          {loading ? (
            <p style={{ color: "#64748b" }}>Loading categories…</p>
          ) : categories.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No categories yet. Add one above — it will appear in the navbar.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, index) => (
                    <tr key={cat.id}>
                      <td>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            disabled={index === categories.length - 1}
                            onClick={() => move(index, 1)}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                      <td>{cat.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>
                        {cat.slug}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => handleDelete(cat)}
                        >
                          Delete
                        </button>
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
