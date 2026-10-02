import { NextResponse } from 'next/server';
import { getAuthenticatedUser, checkRateLimit, sanitizeString, getClientIp } from '@/lib/security';
import { supabaseServer } from '@/lib/supabaseServer';

// Strict regex to ensure upload URLs only target official Google Drive resumable upload sessions
const GOOGLE_DRIVE_UPLOAD_REGEX = /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?uploadType=resumable&upload_id=[a-zA-Z0-9_-]+/;

export async function POST(request: Request) {
    try {
        const clientIp = getClientIp(request);

        // 1. Rate Limiting: Max 30 actions per minute per IP
        const rateLimit = checkRateLimit(`drive_action:${clientIp}`, 30, 60);
        if (!rateLimit.success) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please wait a moment.' },
                { status: 429 }
            );
        }

        // 2. Authentication Check
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. You must be logged in.' },
                { status: 401 }
            );
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON request' }, { status: 400 });
        }

        const action = sanitizeString(body.action, 50);
        if (!['get_upload_url', 'make_public', 'delete'].includes(action)) {
            return NextResponse.json({ success: false, error: 'Invalid action requested.' }, { status: 400 });
        }

        // 3. Authorization for Deletion: Only Admin or the file owner can trigger deletion
        if (action === 'delete') {
            const fileId = sanitizeString(body.fileId, 100);
            if (!fileId) {
                return NextResponse.json({ success: false, error: 'File ID is required for deletion.' }, { status: 400 });
            }

            const isAdmin = user.role === 'admin' || user.id === 'admin_user';
            if (!isAdmin) {
                // Verify ownership against the database
                const { data: fileRecord } = await supabaseServer
                    .from('courses')
                    .select('uploader')
                    .ilike('pdf_url', `%${fileId}%`)
                    .maybeSingle();

                if (fileRecord && fileRecord.uploader?.toLowerCase() !== user.name.toLowerCase()) {
                    return NextResponse.json(
                        { success: false, error: 'Forbidden. You do not have permission to delete this file.' },
                        { status: 403 }
                    );
                }
            }
        }

        const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
        if (!googleScriptUrl) {
            console.error('GOOGLE_SCRIPT_URL environment variable is not configured.');
            return NextResponse.json(
                { success: false, error: 'Storage provider URL is not configured on the server.' },
                { status: 500 }
            );
        }

        // Forward to Google Apps Script
        const res = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body),
            redirect: 'follow',
            cache: 'no-store'
        });

        const text = await res.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.error('Google Script non-JSON response:', text.slice(0, 300));
            return NextResponse.json(
                {
                    success: false,
                    error: 'Drive storage service returned an invalid response. Please try again.'
                },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Drive proxy error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to communicate with Google Drive service.'
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const clientIp = getClientIp(request);

        // 1. Rate Limiting: Max 120 chunk uploads per minute per IP
        const rateLimit = checkRateLimit(`drive_upload:${clientIp}`, 120, 60);
        if (!rateLimit.success) {
            return NextResponse.json(
                { success: false, error: 'Upload rate limit exceeded. Please wait a moment.' },
                { status: 429 }
            );
        }

        // 2. Authentication Check
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized.' },
                { status: 401 }
            );
        }

        // 3. Strict SSRF Protection: Validate target Google Drive URL
        const uploadUrl = request.headers.get('x-upload-url');
        if (!uploadUrl || !GOOGLE_DRIVE_UPLOAD_REGEX.test(uploadUrl)) {
            return NextResponse.json(
                { success: false, error: 'Invalid or unauthorized upload destination.' },
                { status: 400 }
            );
        }

        const contentRange = request.headers.get('content-range');
        const contentType = request.headers.get('content-type') || 'application/octet-stream';

        const forwardHeaders: Record<string, string> = {
            'Content-Type': contentType,
        };
        if (contentRange) {
            forwardHeaders['Content-Range'] = contentRange;
        }

        const bodyBuffer = Buffer.from(await request.arrayBuffer());
        forwardHeaders['Content-Length'] = bodyBuffer.length.toString();

        // 4. Forward payload chunk to Google Drive
        const driveRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: forwardHeaders,
            body: bodyBuffer
        });

        const resText = await driveRes.text();
        return new NextResponse(resText, {
            status: driveRes.status,
            headers: {
                'Content-Type': 'application/json',
                'Range': driveRes.headers.get('range') || ''
            }
        });
    } catch (err: any) {
        console.error('Drive upload proxy error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to proxy upload to Google Drive.'
            },
            { status: 500 }
        );
    }
}
