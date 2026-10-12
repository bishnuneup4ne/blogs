import { NextResponse } from "next/server";
import {
  getBlogImageSettings,
  DEFAULT_IMAGE_SETTINGS,
} from "@/lib/imageSettings";

// Public GET only — used by the blog renderer (ZoomableImage).
// The admin "Image Styling" editor was removed; saved overrides that already
// exist in site_settings still apply. Served from the shared unstable_cache so
// gallery/blog fetches don't each pay a Supabase round-trip.
export async function GET() {
  try {
    const settings = await getBlogImageSettings();
    return NextResponse.json(settings ?? DEFAULT_IMAGE_SETTINGS);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
