import { useState, useEffect } from "react";

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
    type: "box" | "diamond" | "circle";
    color: string;
  }>;
  connections: Array<{
    fromId: string;
    toId: string;
    label?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export function useDiagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagrams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagrams");
      if (!res.ok) throw new Error("Failed to fetch diagrams");
      const data = await res.json();
      setDiagrams(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const saveDiagram = async (diagram: Omit<Diagram, "created_at" | "updated_at">) => {
    try {
      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagram),
      });
      if (!res.ok) throw new Error("Failed to save diagram");
      const data = await res.json();
      setDiagrams((prev) =>
        prev.find((d) => d.id === data.id)
          ? prev.map((d) => (d.id === data.id ? data : d))
          : [...prev, data]
      );
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  };

  const deleteDiagram = async (id: string) => {
    try {
      const res = await fetch(`/api/diagrams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete diagram");
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, []);

  return { diagrams, loading, error, saveDiagram, deleteDiagram, refetch: fetchDiagrams };
}
