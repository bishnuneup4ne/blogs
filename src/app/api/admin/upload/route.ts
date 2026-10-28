import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

type Kind = { ext: string; mime: string; max: number; test: (b: Uint8Array) => boolean };

const MAGIC: Kind[] = [
  { ext: "jpg", mime: "image/jpeg", max: MAX_IMAGE_BYTES, test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", max: MAX_IMAGE_BYTES, test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "webp", mime: "image/webp", max: MAX_IMAGE_BYTES, test: (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { ext: "gif", mime: "image/gif", max: MAX_IMAGE_BYTES, test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  // MP4 / MOV: ISO-BMFF "ftyp" box at byte 4
  { ext: "mp4", mime: "video/mp4", max: MAX_VIDEO_BYTES, test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  { ext: "webm", mime: "video/webm", max: MAX_VIDEO_BYTES, test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await db.storage
    .from(env.storageBucket)
    .list("uploads", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const files = (data ?? [])
    .filter((file) => file.name && !file.name.startsWith(".") && !file.name.endsWith("/") && Number(file.metadata?.size ?? 0) > 0)
    .filter((file) => {
      const type = String(file.metadata?.mimetype ?? "");
      return type.startsWith("image/") || type.startsWith("video/");
    })
    .map((file) => {
      const path = `uploads/${file.name}`;
      const { data: publicUrl } = db.storage.from(env.storageBucket).getPublicUrl(path);
      return {
        name: file.name,
        src: publicUrl.publicUrl,
        size: Number(file.metadata?.size ?? 0),
        type: String(file.metadata?.mimetype ?? "application/octet-stream"),
        created_at: file.created_at ?? "",
      };
    });
  return NextResponse.json({ files });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "invalid file name" }, { status: 400 });
  }
  const { data, error } = await db.storage.from(env.storageBucket).remove([`uploads/${name}`]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "File not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  // Two shapes: multipart file upload, or JSON { url } to import a remote file. v2
  const contentType = request.headers.get("content-type") ?? "";
  let bytes: Uint8Array | null = null;

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const raw = typeof body?.url === "string" ? body.url.trim() : "";
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Enter a valid http(s) URL" }, { status: 400 });
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return NextResponse.json({ error: "Only http(s) URLs can be imported" }, { status: 400 });
    }
    const fetched = await fetch(target.toString(), {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; SiteUploadImport/1.0)" },
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    if (!fetched?.ok) {
      return NextResponse.json({ error: "Could not download that URL" }, { status: 400 });
    }
    const declaredSize = Number(fetched.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Remote file is too large" }, { status: 413 });
    }
    const buf = await fetched.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Remote file is empty or too large" }, { status: 413 });
    }
    bytes = new Uint8Array(buf);
  } else {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > MAX_VIDEO_BYTES + 1_000_000) {
      return NextResponse.json({ error: "Upload is too large" }, { status: 413 });
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (file.size === 0 || file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "File is empty or too large" }, { status: 413 });
    }
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  const kind = MAGIC.find((m) => m.test(bytes!));
  if (!kind) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF images or MP4/WebM videos are allowed" }, { status: 400 });
  }
  if (bytes!.length === 0 || bytes!.length > kind.max) {
    return NextResponse.json(
      { error: `File must be between 1 byte and ${kind.max / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const path = `uploads/${Date.now()}-${id}.${kind.ext}`;
  const { error } = await db.storage.from(env.storageBucket).upload(path, bytes!, { contentType: kind.mime, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = db.storage.from(env.storageBucket).getPublicUrl(path);
  const itemType = kind.mime.startsWith("video/") ? "video" : "image";
  return NextResponse.json({ ok: true, url: data.publicUrl, src: data.publicUrl, kind: itemType, id });
}
