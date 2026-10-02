import { NextResponse } from 'next/server';

interface CachedThumb {
    buffer: ArrayBuffer;
    contentType: string;
    timestamp: number;
}

// In-memory cache for ultra-low latency (< 1ms) serving of frequently accessed thumbnails
const memoryCache = new Map<string, CachedThumb>();
const MAX_CACHE_ITEMS = 200;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days in memory

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    const sz = searchParams.get('sz') || 'w400';

    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }

    const cacheKey = `${fileId}_${sz}`;

    // 1. Check in-memory RAM cache (< 1ms instant response)
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return new NextResponse(cached.buffer, {
            status: 200,
            headers: {
                'Content-Type': cached.contentType,
                'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400, immutable',
                'X-Thumbnail-Cache': 'HIT',
            }
        });
    }

    // 2. Fetch directly from Google Drive thumbnail service
    // Google Drive's /thumbnail endpoint is purpose-built to render the first page of Drive documents
    const targetUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=${sz}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
            const contentType = res.headers.get('content-type') || 'image/png';
            // Only accept genuine image content (never raw application/pdf or octet-stream)
            if (contentType.startsWith('image/')) {
                const buffer = await res.arrayBuffer();

                // Save to LRU memory cache
                if (memoryCache.size >= MAX_CACHE_ITEMS) {
                    const firstKey = memoryCache.keys().next().value;
                    if (firstKey) memoryCache.delete(firstKey);
                }
                memoryCache.set(cacheKey, {
                    buffer,
                    contentType,
                    timestamp: Date.now()
                });

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400, immutable',
                        'X-Thumbnail-Cache': 'MISS',
                    }
                });
            }
        }
    } catch {
        // Fall through to 404
    }

    return new NextResponse('Thumbnail unavailable', { status: 404 });
}
