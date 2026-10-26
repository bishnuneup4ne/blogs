import "server-only";

import { normalizeBlocks, safeImageUrl } from "@/lib/sanitize-rich";
import type { Block } from "@/lib/types";

const STATUSES = ["draft", "review", "scheduled", "published"] as const;

export type PostInput = {
  title?: string;
  slug?: string;
  summary?: string;
  status?: (typeof STATUSES)[number];
  topic_slug?: string | null;
  author_id?: string | null;
  tags?: string[];
  cover_url?: string | null;
  cover_alt?: string;
  date?: string;
  reading_minutes?: number;
  blocks?: Block[];
  featured?: boolean;
};

type Result = { ok: true; data: PostInput } | { ok: false; error: string };

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 300);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return value;
}

export function parsePostInput(input: unknown, options: { partial: boolean; title?: string }): Result {
  if (!isRecord(input)) return { ok: false, error: "Invalid request body" };
  const data: PostInput = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);

  if (!options.partial || has("title")) {
    const title = typeof input.title === "string" ? input.title.trim().slice(0, 300) : "";
    if (!title) return { ok: false, error: "Title is required" };
    data.title = title;
  }

  if (has("slug")) {
    const slug = typeof input.slug === "string" ? slugify(input.slug) : "";
    if (slug) data.slug = slug;
    else if (options.partial) return { ok: false, error: "Slug cannot be empty" };
    else return { ok: false, error: "Slug must contain letters or numbers" };
  } else if (!options.partial) {
    data.slug = slugify(data.title ?? options.title ?? "");
    if (!data.slug) return { ok: false, error: "Slug must contain letters or numbers" };
  }

  if (has("summary")) data.summary = typeof input.summary === "string" ? input.summary.trim().slice(0, 2000) : "";
  if (has("status")) {
    if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) return { ok: false, error: "Invalid status" };
    data.status = input.status as (typeof STATUSES)[number];
  }
  if (has("topic_slug")) {
    const topic = typeof input.topic_slug === "string" ? input.topic_slug.trim().slice(0, 100) : "";
    data.topic_slug = /^[a-z0-9-]*$/.test(topic) ? topic || null : null;
  }
  if (has("author_id")) {
    const author = typeof input.author_id === "string" ? input.author_id.trim().slice(0, 100) : "";
    data.author_id = /^[a-zA-Z0-9-]*$/.test(author) ? author || null : null;
  }
  if (has("tags")) {
    if (!Array.isArray(input.tags)) return { ok: false, error: "Tags must be an array" };
    const tags = input.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim().slice(0, 60))
      .filter(Boolean);
    data.tags = [...new Set(tags)].slice(0, 20);
  }
  if (has("cover_url")) {
    if (input.cover_url === null || input.cover_url === "") data.cover_url = null;
    else {
      const cover = typeof input.cover_url === "string" ? safeImageUrl(input.cover_url) : null;
      if (!cover) return { ok: false, error: "Cover image must be an http(s) URL or a local /path" };
      data.cover_url = cover;
    }
  }
  if (has("cover_alt")) data.cover_alt = typeof input.cover_alt === "string" ? input.cover_alt.trim().slice(0, 600) : "";
  if (has("date")) {
    const date = typeof input.date === "string" ? cleanDate(input.date) : null;
    if (!date) return { ok: false, error: "Date must be a valid YYYY-MM-DD value" };
    data.date = date;
  }
  if (has("reading_minutes")) {
    const minutes = Number(input.reading_minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return { ok: false, error: "Reading time must be between 1 and 240 minutes" };
    }
    data.reading_minutes = Math.round(minutes);
  }
  if (has("featured")) data.featured = Boolean(input.featured);
  if (has("blocks")) {
    if (!Array.isArray(input.blocks)) return { ok: false, error: "Blocks must be an array" };
    const blocks = normalizeBlocks(input.blocks);
    if (blocks.length !== input.blocks.length) return { ok: false, error: "One or more content blocks are invalid" };
    data.blocks = blocks;
  } else if (!options.partial) {
    data.blocks = [];
  }

  return { ok: true, data };
}
