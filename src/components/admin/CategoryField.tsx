"use client";

import { useCallback, useEffect, useState } from "react";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type CategoryFieldProps = {
  value: string;
  onChange: (name: string) => void;
};

export function CategoryField({ value, onChange }: CategoryFieldProps) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setCategories(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    setError("");
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
        onChange(data.name);
        await load();
      } else {
        setError(data.error || "Could not add category");
      }
    } catch {
      setError("Could not add category");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="form-field">
      <label className="form-label">Category</label>
      <select
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select category…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          className="form-input"
          style={{ flex: "1 1 160px", margin: 0 }}
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={adding || !newName.trim()}
          onClick={handleAdd}
        >
          {adding ? "Adding…" : "+ Add category"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: "12px", color: "#f87171", marginTop: "6px" }}>{error}</p>
      )}
      <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
        New categories appear in the navbar and on the Categories page.
      </p>
    </div>
  );
}
