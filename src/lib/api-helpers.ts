import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateContentCache } from "@/lib/data";
import { safeImageUrl } from "@/lib/sanitize-rich";
import { db } from "@/lib/supabase/server";

export type Handler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>;

/** Wraps an admin mutation route: cookie auth + JSON errors + cache revalidation. */
export function adminRoute(handler: Handler) {
  return async (req: NextRequest, ctx: { params: Promise<any> }) => {
    const denied = await requireAdmin();
    if (denied) return denied;
    try {
      const res = await handler(req, ctx);
      if (res.status < 400 && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        await revalidateContentCache();
      }
      return res;
    } catch (error) {
      console.error("[admin-api]", req.method, req.nextUrl.pathname, error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  return ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
}

export function str(v: unknown, max = 4000): string | null {
  return typeof v === "string" ? v.slice(0, max) : null;
}

export function slug(v: unknown, max = 160): string | null {
  const text = str(v, max);
  if (text === null) return null;
  return text.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function integer(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export function image(v: unknown, fallback = ""): string {
  const text = str(v, 600);
  return text ? (safeImageUrl(text) ?? fallback) : fallback;
}

export function hexColor(v: unknown, fallback = "#1a73e8"): string {
  const text = str(v, 7);
  return text && /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

export function dateOnly(v: unknown): string | null {
  const text = str(v, 10);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
}

export function email(v: unknown): string | null {
  const text = (str(v, 200) ?? "").trim();
  if (!text) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export { db };
