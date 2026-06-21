import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const [writeupsRes, projectsRes] = await Promise.all([
    supabaseAdmin
      .from("writeups")
      .select("id, title, slug, category, updated_at")
      .eq("is_deleted", true)
      .order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("projects")
      .select("id, title, slug, updated_at")
      .eq("is_deleted", true)
      .order("updated_at", { ascending: false }),
  ]);

  if (writeupsRes.error) {
    return NextResponse.json({ error: writeupsRes.error.message }, { status: 500 });
  }
  if (projectsRes.error) {
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    writeups: writeupsRes.data ?? [],
    projects: projectsRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { action, type, id } = body as {
    action: "restore" | "purge";
    type: "writeup" | "project";
    id: string;
  };

  if (!id || !type || !action) {
    return NextResponse.json({ error: "Missing action, type, or id" }, { status: 400 });
  }

  const table = type === "writeup" ? "writeups" : "projects";

  if (action === "restore") {
    const { error } = await supabaseAdmin
      .from(table)
      .update({ is_deleted: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  }

  if (action === "purge") {
    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
