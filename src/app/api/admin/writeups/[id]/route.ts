import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { ensureCategoryExists } from "@/lib/ensureCategory";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { invalidateCache } from "@/lib/apiCache";

const WRITABLE_FIELDS = [
  "title",
  "slug",
  "category",
  "summary",
  "content",
  "featured_image_url",
  "image_url",
  "images",
  "tags",
  "video_url",
  "status",
  "date",
] as const;

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("writeups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabaseAdmin
    .from("writeups")
    .update({ ...pickWritable(body), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.category) {
    await ensureCategoryExists(supabaseAdmin, body.category);
  }
  invalidateCache("admin:");
  revalidatePath("/", "layout");

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("writeups")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateCache("admin:");
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
