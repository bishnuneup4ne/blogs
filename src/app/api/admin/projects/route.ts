import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { revalidateContentCache } from "@/lib/cache";
import { toSlug } from "@/lib/slug";
import { pick, PROJECT_COLUMNS } from "@/lib/writeWhitelist";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, title, slug, status, summary, created_at, date, technologies")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load projects:", error);
    return NextResponse.json({ error: "Failed to load projects." }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));

  const fields = pick<Record<string, unknown>>(body, PROJECT_COLUMNS);
  if (typeof fields.content === "string") fields.content = sanitizeMdxContent(fields.content);
  const title = typeof fields.title === "string" ? fields.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const slug = (typeof fields.slug === "string" && fields.slug.trim()) || toSlug(title);

  if (!slug) {
    return NextResponse.json(
      { error: "Title must contain at least one letter or number to create a URL." },
      { status: 400 },
    );
  }

  const payload = {
    ...fields,
    title,
    slug,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Project insert error:", error);
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A project with this URL already exists. Choose a different title or slug."
            : "Failed to save the project.",
      },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }
  revalidatePath("/", "layout");
  revalidateContentCache({ projectSlug: data?.slug });
  return NextResponse.json(data, { status: 201 });
}
