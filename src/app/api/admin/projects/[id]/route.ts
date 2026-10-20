import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { revalidateContentCache } from "@/lib/cache";
import { pick, PROJECT_COLUMNS } from "@/lib/writeWhitelist";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load project:", error);
    return NextResponse.json({ error: "Failed to load project." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const fields = pick<Record<string, unknown>>(body, PROJECT_COLUMNS);
  if (typeof fields.content === "string") fields.content = sanitizeMdxContent(fields.content);

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  if ("title" in fields && !String(fields.title ?? "").trim()) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Another project already uses that URL. Choose a different slug."
            : "Failed to save the project.",
      },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  revalidatePath("/", "layout");
  revalidateContentCache({ projectSlug: data?.slug });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("projects")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Project delete error:", error);
    return NextResponse.json({ error: "Failed to move the project to trash." }, { status: 500 });
  }
  revalidatePath("/", "layout");
  revalidateContentCache({ projectSlug: existing.slug ?? undefined });
  return NextResponse.json({ success: true });
}
