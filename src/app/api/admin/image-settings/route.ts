import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface ImageSettings {
  darkThemeBackground: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  hoverScale: number;
  margin: string;
  imageBackground: string;
}

const TABLE_NAME = "site_settings";
const SETTINGS_KEY = "image_styling";

// GET: Retrieve image settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    if (data && data.value) {
      return NextResponse.json(data.value);
    }

    // Return defaults if not found
    return NextResponse.json({
      darkThemeBackground: "white",
      borderRadius: "8px",
      padding: "0px",
      boxShadow: "none",
      hoverScale: 1.01,
      margin: "0px",
      imageBackground: "white",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Save image settings
export async function POST(request: NextRequest) {
  try {
    // Verify auth (check for admin cookie or token)
    const cookieAuth = request.cookies.get("admin-auth");
    if (!cookieAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ImageSettings = await request.json();

    // Validate settings structure
    if (
      !body.darkThemeBackground ||
      !body.borderRadius ||
      !body.padding ||
      !body.imageBackground
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Try to update, if not exists insert
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("key", SETTINGS_KEY);

    if (deleteError && deleteError.code !== "PGRST116") {
      console.error("Delete error:", deleteError);
    }

    const { error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert({
        key: SETTINGS_KEY,
        value: body,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
