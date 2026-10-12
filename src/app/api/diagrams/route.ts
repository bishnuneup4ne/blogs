import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

const MAX_NODES = 500;
const MAX_CONNECTIONS = 1000;
const MAX_NAME_LEN = 200;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("diagrams")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch diagrams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, description, nodes, connections } = body;

    if (typeof name !== "string" || !name.trim() || name.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: "Invalid diagram name" }, { status: 400 });
    }
    if (!Array.isArray(nodes) || nodes.length > MAX_NODES) {
      return NextResponse.json({ error: "Invalid nodes" }, { status: 400 });
    }
    if (!Array.isArray(connections) || connections.length > MAX_CONNECTIONS) {
      return NextResponse.json({ error: "Invalid connections" }, { status: 400 });
    }

    // Server always owns the id — clients cannot overwrite existing diagrams.
    const { data, error } = await supabase
      .from("diagrams")
      .upsert(
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: typeof description === "string" ? description.slice(0, 2000) : "",
          nodes,
          connections,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to save diagram" }, { status: 500 });
  }
}
