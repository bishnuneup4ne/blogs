import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { STORAGE_BUCKET, getPublicStorageUrl } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;

// SVG is deliberately not accepted: it can carry <script>, foreignObject and
// event handlers, and this bucket is public, so an uploaded SVG is stored XSS.
const RASTER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Identify the image from its bytes. The client-supplied File.type is attacker
 * controlled, so it is never trusted for the allow-list or the stored content type.
 */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  const head = buffer.subarray(0, 6).toString("latin1");
  if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
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

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = sniffImageType(buffer);

    if (!detectedType || !(detectedType in RASTER_TYPES)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, GIF, or WebP images are allowed." },
        { status: 400 },
      );
    }

    // Extension and stored content type both come from the sniffed type, never
    // from the filename or the client's declared MIME type.
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${RASTER_TYPES[detectedType]}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
      contentType: detectedType,
      // upsert:false — overwriting an existing path would let a reused filename
      // silently replace an already-published image.
      upsert: false,
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
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
