import { NextRequest, NextResponse } from 'next/server';
import { safeUrl, safeFetch } from '@/lib/safeUrl';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get('url');

    // Reject private / non-http targets before any request is made.
    if (!safeUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 });
    }

    const response = await safeFetch(imageUrl!, { timeoutMs: 8000 });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 502 }
      );
    }

    // Only ever proxy real images — never HTML, JSON, or scripts.
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL is not an image' }, { status: 415 });
    }

    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    const imageData = await response.arrayBuffer();
    if (imageData.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    return new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
