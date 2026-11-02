import fs from "fs";

interface CachedPdf {
    base64: string;
    mimeType: string;
    byteLength: number;
    timestamp: number;
}

const pdfCache = new Map<string, CachedPdf>();
const PDF_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

export function getDriveFileId(url: string): string | null {
    if (!url) return null;
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];
    const match3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match3 && match3[1]) return match3[1];
    return null;
}

/**
 * Robustly fetch and cache a PDF from Google Drive (or any direct URL).
 * Automatically follows virus-scan confirmations and validates %PDF magic bytes.
 */
export async function fetchPdfBuffer(pdfUrl: string): Promise<{ base64: string; mimeType: string; byteLength: number } | null> {
    if (!pdfUrl) return null;

    const fileId = getDriveFileId(pdfUrl);
    const cacheKey = fileId || pdfUrl;

    const cached = pdfCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < PDF_CACHE_TTL)) {
        return { base64: cached.base64, mimeType: cached.mimeType, byteLength: cached.byteLength };
    }

    const downloadUrl = fileId 
        ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
        : pdfUrl;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        let res = await fetch(downloadUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/pdf,*/*"
            }
        });

        // Handle Google Drive virus scan warning page if encountered
        if (res.ok) {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("text/html") && fileId) {
                const text = await res.text();
                // Check for confirmation link / token in HTML
                const confirmMatch = text.match(/confirm=([0-9a-zA-Z_-]+)/) || text.match(/name="confirm"\s+value="([^"]+)"/);
                if (confirmMatch && confirmMatch[1]) {
                    const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`;
                    res = await fetch(confirmUrl, {
                        signal: controller.signal,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "application/pdf,*/*"
                        }
                    });
                }
            }
        }
        clearTimeout(timeout);

        if (!res.ok) {
            console.warn(`[PDF Fetcher] HTTP ${res.status} fetching ${downloadUrl}`);
            return null;
        }

        const arrayBuffer = await res.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength < 10) {
            return null;
        }

        // Validate %PDF magic bytes
        const header = Buffer.from(arrayBuffer.slice(0, 5)).toString("utf8");
        if (!header.startsWith("%PDF")) {
            console.warn(`[PDF Fetcher] Invalid PDF header for ${cacheKey}: "${header}"`);
            return null;
        }

        // Gemini inlineData supports up to ~25MB base64 safely
        if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
            console.warn(`[PDF Fetcher] File exceeds 25MB multimodal inline limit: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);
            return null;
        }

        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = "application/pdf";
        const byteLength = arrayBuffer.byteLength;

        pdfCache.set(cacheKey, {
            base64,
            mimeType,
            byteLength,
            timestamp: Date.now()
        });

        console.log(`[PDF Fetcher] ✓ Cached PDF (${(byteLength / 1024).toFixed(1)} KB) for key: ${cacheKey}`);
        return { base64, mimeType, byteLength };
    } catch (err: any) {
        console.warn(`[PDF Fetcher] Failed to fetch PDF for ${pdfUrl}:`, err?.message || err);
        return null;
    }
}

