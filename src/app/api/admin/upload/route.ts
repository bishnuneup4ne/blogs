import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { STORAGE_BUCKET, getPublicStorageUrl } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

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
    const safeExt = ["jpeg", "jpg", "png", "gif", "webp", "svg"].includes(ext) ? ext : "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`;
    const filePath = `uploads/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

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
