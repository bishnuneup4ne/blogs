import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { STORAGE_BUCKET, getPublicStorageUrl } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
// SVG excluded: it can embed <script> and is served from a public bucket.
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function hasImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true;
  // GIF
  if (buf.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) return true;
  // WebP: RIFF....WEBP
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return true;
  return false;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, WebP, or SVG images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "gif", "webp"].includes(ext) ? ext : "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
    const filePath = `uploads/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Client-declared MIME is untrusted — verify the file's magic bytes.
    if (!hasImageMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "File content does not match a valid JPEG, PNG, GIF, or WebP image." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        {
          error:
            error.message ||
            `Upload failed. In Supabase → Storage, create a public bucket named "${STORAGE_BUCKET}".`,
        },
        { status: 500 },
      );
    }

    const url = getPublicStorageUrl(filePath);

    return NextResponse.json({ url, path: filePath });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "An error occurred during upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
