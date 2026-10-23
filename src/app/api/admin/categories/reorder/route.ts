import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revalidateContentCache } from "@/lib/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

/**
 * Move a category up or down the nav order.
 *
 * Swapping two `sort_order` values needs two writes, so the pair is applied
 * server-side with a rollback: if the second write fails, the first one is
 * reverted so the list is never left half-swapped.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Category id is required" }, { status: 400 });
    }

    const direction = body.direction === "up" ? -1 : body.direction === "down" ? 1 : 0;
    if (direction === 0) {
      return NextResponse.json({ error: "direction must be 'up' or 'down'" }, { status: 400 });
    }

    const { data: rows, error: listError } = await supabaseAdmin
      .from("categories")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const list = rows ?? [];
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const target = index + direction;
    if (target < 0 || target >= list.length) {
      return NextResponse.json({ error: "Already at the edge of the list" }, { status: 400 });
    }

    const current = list[index];
    const neighbour = list[target];

    const { error: firstError } = await supabaseAdmin
      .from("categories")
      .update({ sort_order: neighbour.sort_order })
      .eq("id", current.id);

    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const { error: secondError } = await supabaseAdmin
      .from("categories")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbour.id);

    if (secondError) {
      // Roll back the first write so the two rows keep their original order.
      await supabaseAdmin
        .from("categories")
        .update({ sort_order: current.sort_order })
        .eq("id", current.id);
      return NextResponse.json({ error: secondError.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    revalidateContentCache();

    const { data, error: selectError } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (selectError) {
      return NextResponse.json({ success: true, categories: [] });
    }

    return NextResponse.json({ success: true, categories: data ?? [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to reorder categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
