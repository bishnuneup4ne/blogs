import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { ensureCategoryExists } from "@/lib/ensureCategory";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseAdmin
    .from("writeups")
    .select("id, title, slug, status, category, created_at, date, summary, tags, video_url")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const body = await request.json();

  const slug = body.slug || body.title
    ?.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const payload = {
    ...body,
    slug,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("writeups")
    .insert([payload])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await ensureCategoryExists(supabaseAdmin, payload.category);
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
