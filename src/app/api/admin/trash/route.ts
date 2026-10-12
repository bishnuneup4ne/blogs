import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { cachedQuery, invalidateCache } from "@/lib/apiCache";

interface TrashRow {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  updated_at: string;
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await cachedQuery<TrashRow[]>(
    "admin:trash",
    15_000,
    () =>
      supabaseAdmin
        .from("writeups")
        .select("id, title, slug, category, updated_at")
        .eq("is_deleted", true)
        .order("updated_at", { ascending: false })
        .limit(500)
        .then((r) => ({ data: r.data, error: r.error ? { message: r.error.message } : null })),
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ writeups: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { action, id } = body as {
    action: "restore" | "purge";
    type?: string;
    id: string;
  };

  if (!id || !action) {
    return NextResponse.json({ error: "Missing action or id" }, { status: 400 });
  }

  if (action === "restore") {
    const { error } = await supabaseAdmin
      .from("writeups")
      .update({ is_deleted: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateCache("admin:");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  }

  if (action === "purge") {
    const { error } = await supabaseAdmin.from("writeups").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    invalidateCache("admin:");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
