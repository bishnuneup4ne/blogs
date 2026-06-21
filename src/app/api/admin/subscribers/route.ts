import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const { data: subscribers, error } = await supabaseAdmin
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch subscribers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers from database.' },
        { status: 500 }
      );
    }

    return NextResponse.json(subscribers, { status: 200 });
  } catch (error) {
    console.error('Fetch subscribers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
