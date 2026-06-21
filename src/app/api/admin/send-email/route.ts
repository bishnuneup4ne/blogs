import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const { subject, message } = await request.json();

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required.' },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured in the environment variables.' },
        { status: 500 }
      );
    }

    // Fetch all active subscribers
    const { data: subscribers, error } = await supabaseAdmin
      .from('subscribers')
      .select('email')
      .eq('status', 'active');

    if (error) {
      console.error('Failed to fetch subscribers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers from database.' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found.' },
        { status: 404 }
      );
    }

    // Extract emails
    const bccEmails = subscribers.map((sub: { email: string }) => sub.email);

    // Send email using Resend
    // Note: Resend restricts the number of BCC emails in a single request (usually 50).
    // For large lists, you would need to chunk this or use an Audience/Broadcast feature.
    // Assuming < 50 for this implementation.
    const { data, error: resendError } = await resend.emails.send({
      from: process.env.NEXT_PUBLIC_SITE_NAME
        ? `${process.env.NEXT_PUBLIC_SITE_NAME} <newsletter@updates.yourdomain.com>` // Needs verified domain
        : 'Newsletter <onboarding@resend.dev>', // Fallback for testing
      to: 'delivered@resend.dev', // You must have a 'to' address.
      bcc: bccEmails,
      subject: subject,
      html: message,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json(
        { error: resendError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `Successfully sent email to ${bccEmails.length} subscribers!`, data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
