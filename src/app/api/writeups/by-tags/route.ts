import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

/**
 * GET /api/writeups/by-tags?tags=tag1,tag2&limit=10
 * Returns recent published writeups that contain any of the specified tags
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get("tags");
    const limitParam = searchParams.get("limit");

    if (!tagsParam) {
      return NextResponse.json({ error: "tags parameter is required" }, { status: 400 });
    }

    const tags = tagsParam.split(",").map((t) => t.trim().toLowerCase());
    const limit = Math.min(parseInt(limitParam || "10"), 50); // Max 50 posts

    const { data, error } = await supabase
      .from("writeups")
      .select("id, title, slug, summary, featured_image_url, created_at, tags")
      .eq("status", "Published")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit * 2); // Fetch extra to filter by tags

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter posts that contain at least one of the tags
    const filteredPosts = (data || []).filter((post) => {
      const postTags = (post.tags || []).map((t: string) => t.toLowerCase());
      return tags.some((tag) => postTags.includes(tag));
    });

    return NextResponse.json(filteredPosts.slice(0, limit));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
