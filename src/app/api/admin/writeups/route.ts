import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { ensureCategoryExists } from "@/lib/ensureCategory";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { cachedQuery, invalidateCache } from "@/lib/apiCache";

// Explicit allow-list — never mass-assign the raw request body (server owns
// id / created_at / updated_at / is_deleted).
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

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await cachedQuery<Record<string, unknown>[]>(
    "admin:writeups",
    30_000,
    () =>
      supabaseAdmin
        .from("writeups")
        .select("id, title, slug, status, category, created_at, date, summary, tags, video_url")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(500)
        .then((r) => ({ data: r.data, error: r.error ? { message: r.error.message } : null })),
  );

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));

  if (typeof body?.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const slug = (
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim()
      : body.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
  ).replace(/^-+|-+$/g, "");

  if (!slug) {
    return NextResponse.json({ error: "Could not derive a valid slug" }, { status: 400 });
  }

  const payload = {
    ...pickWritable(body),
    title: body.title.trim(),
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

  await ensureCategoryExists(
    supabaseAdmin,
    (payload as { category?: string }).category
  );
  invalidateCache("admin:");
  revalidatePath("/", "layout");

  return NextResponse.json(data, { status: 201 });
}
