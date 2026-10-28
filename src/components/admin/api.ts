"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: "draft" | "review" | "scheduled" | "published";
  topic_slug: string | null;
  author_id: string | null;
  tags: string[];
  cover_url: string | null;
  cover_alt: string | null;
  cover_height?: number | null;
  cover_focal?: number | null;
  date: string;
  reading_minutes: number;
  blocks: unknown[];
  featured: boolean;
  updated_at?: string;
}

export interface ApiTopic {
  id: string;
  name: string;
  slug: string;
  description: string;
  pastel: string;
  color: string;
  image_url?: string | null;
  shape?: string | null;
  sort_order: number;
}

export interface ApiAuthor {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string;
  short_bio?: string;
  bio?: string;
  status?: "active" | "inactive";
  social_links?: { label: string; url: string; icon?: string }[];
  sort_order: number;
}

export interface ApiAlbum {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  year: number;
  cover_url: string;
  sort_order: number;
  photo_count?: number;
  video_count?: number;
  first_photo?: string;
}

export interface ApiPhoto {
  id: string;
  album_id: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  taken_at: string | null;
  camera: string;
  kind?: "image" | "video";
  poster_url?: string;
  external?: boolean;
  position: number;
  cover?: boolean;
}

export interface ApiSubscriber {
  id: string;
  email: string;
  name: string;
  status: string;
  source: string;
  joined_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      // Merge rather than replace, so a caller's headers survive. FormData
      // bodies must NOT carry content-type — the browser sets the multipart
      // boundary itself, and overriding it makes the POST fail outright.
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers as Record<string, string> | undefined),
      },
      // A wedged request would otherwise spin forever with no message.
      signal: init?.signal ?? AbortSignal.timeout(30_000),
    });
  } catch (error) {
    // Navigating away cancels in-flight fetches; that is not a failure.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new Error(
      timedOut
        ? "The server took too long to respond. Check your connection and try again."
        : "Could not reach the server. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    // An expired session turns every screen into "Unauthorized" with no way
    // out — send the editor back to sign-in instead.
    if (res.status === 401 && !path.startsWith("/api/admin/auth")) {
      window.location.assign(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Fetch a collection once on mount; expose refresh + mutation helpers. */
export function useApiCollection<T>(path: string, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<{ [k: string]: T[] }>(path);
      if (!alive.current) return;
      setItems(data[key] ?? []);
      setError("");
    } catch (e) {
      // An aborted request means the screen went away — no banner for that.
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load, setItems };
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async (file: File): Promise<{ src: string; kind?: "image" | "video" }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || "Upload failed");
    }
    return (await res.json()) as { src: string; kind?: "image" | "video" };
  },
};

export interface ApiUpload {
  name: string;
  src: string;
  size: number;
  type: string;
  created_at: string;
}

export interface ApiMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ApiComment {
  id: string;
  post_slug: string;
  parent_id?: string | null;
  name: string;
  email: string;
  body: string;
  status: "pending" | "approved" | "spam";
  created_at: string;
}

export interface ApiSeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_url?: string | null;
  status: "draft" | "live";
  posts?: number;
  post_ids?: string[];
}
