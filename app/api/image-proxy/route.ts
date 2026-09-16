import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route
 * Fetches external images (Google Drive etc.) server-side and returns them,
 * bypassing browser CORS restrictions that block direct cross-origin image loads.
 *
 * Usage: /api/image-proxy?url=<encoded-image-url>
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    let targetUrl: string;
    try {
        targetUrl = decodeURIComponent(rawUrl);
    } catch {
        return new NextResponse('Invalid url parameter', { status: 400 });
    }

    // Only proxy Google Drive / Google-hosted URLs for safety
    const allowedHosts = [
        'drive.google.com',
        'lh3.googleusercontent.com',
        'lh4.googleusercontent.com',
        'googleusercontent.com',
        'googleapis.com',
    ];
    const isAllowed = allowedHosts.some(host => targetUrl.includes(host));
    if (!isAllowed) {
        return new NextResponse('URL not allowed', { status: 403 });
    }

    // Extract file ID and try thumbnail API first (most reliable, no consent pages)
    const fileIdMatch = targetUrl.match(/\/file\/d\/([^/?]+)/) || targetUrl.match(/[?&]id=([^&]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1].split('?')[0] : null;

    const urlsToTry: string[] = [];
    if (fileId) {
        urlsToTry.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
        urlsToTry.push(`https://drive.google.com/uc?export=view&id=${fileId}`);
    }
    if (!urlsToTry.includes(targetUrl)) {
        urlsToTry.push(targetUrl);
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    for (const tryUrl of urlsToTry) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(tryUrl, { signal: controller.signal, headers, redirect: 'follow' });
            clearTimeout(timeoutId);

            if (!res.ok) continue;

            const contentType = res.headers.get('content-type') || '';
            // Skip HTML responses (consent/virus scan pages)
            if (contentType.includes('text/html') || contentType.includes('text/plain')) continue;

            const imageContentType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
            const arrayBuffer = await res.arrayBuffer();
            if (arrayBuffer.byteLength < 100) continue; // Too small — not a real image

            return new NextResponse(arrayBuffer, {
                status: 200,
                headers: {
                    'Content-Type': imageContentType,
                    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } catch {
            // Try next URL
        }
    }

    return new NextResponse('Could not fetch image', { status: 502 });
}
