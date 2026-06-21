import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { toSlug } from "@/lib/slug";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = toSlug(name);
    if (!slug) {
      return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
    }

    const { data: maxRow } = await supabaseAdmin
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order =
      typeof body.sort_order === "number" ? body.sort_order : (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({ name, slug, sort_order })
      .select("id, name, slug, sort_order, created_at")
      .single();

    if (error) {
      const message =
        error.code === "23505" ? "A category with that name already exists" : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
