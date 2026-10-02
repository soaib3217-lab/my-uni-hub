import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAuthenticatedUser, sanitizeString } from '@/lib/security';

// POST: Add new course material (Requires authentication)
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. You must be logged in to upload materials.' },
                { status: 401 }
            );
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON request' }, { status: 400 });
        }

        const title = sanitizeString(body.title, 200);
        const course_code = sanitizeString(body.course_code, 50);
        const category = sanitizeString(body.category, 50);
        const year = sanitizeString(body.year, 20);
        const semester = sanitizeString(body.semester, 20);
        const pdf_url = typeof body.pdf_url === 'string' ? body.pdf_url.trim() : '';

        if (!title || !course_code || !pdf_url) {
            return NextResponse.json(
                { success: false, error: 'Title, course code, and valid document URL are required.' },
                { status: 400 }
            );
        }

        // Validate URL protocol
        if (!pdf_url.startsWith('https://') && !pdf_url.startsWith('http://')) {
            return NextResponse.json(
                { success: false, error: 'Invalid file URL protocol.' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseServer.from('courses').insert({
            title,
            course_code,
            category: category || 'Course Materials',
            year: year || 'Year 1',
            semester: semester || 'Semester 1',
            pdf_url,
            uploader: user.name
        }).select().single();

        if (error) {
            console.error('Course insert error:', error);

            // 🛑 AUTOMATIC ROLLBACK: If database insert fails, remove orphaned file from Google Drive
            const driveMatch = pdf_url.match(/\/d\/([a-zA-Z0-9_-]+)/) || pdf_url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                const fileId = driveMatch[1];
                const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
                if (googleScriptUrl) {
                    try {
                        await fetch(googleScriptUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain' },
                            body: JSON.stringify({ action: 'delete', fileId })
                        });
                        console.log(`Cleaned up orphaned Google Drive file ${fileId} after database insert error.`);
                    } catch (cleanupErr) {
                        console.error('Failed to cleanup Drive file on insert error:', cleanupErr);
                    }
                }
            }

            return NextResponse.json({ success: false, error: 'Failed to save course record.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, course: data });

    } catch (error) {
        console.error('Course API error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE: Remove course material (Requires uploader ownership or Admin)
export async function DELETE(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Please log in.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('id');

        if (!fileId) {
            return NextResponse.json({ success: false, error: 'File ID is required.' }, { status: 400 });
        }

        // 1. Fetch file record to check ownership
        const { data: file, error: fetchError } = await supabaseServer
            .from('courses')
            .select('*')
            .eq('id', fileId)
            .single();

        if (fetchError || !file) {
            return NextResponse.json({ success: false, error: 'File not found.' }, { status: 404 });
        }

        // 2. Authorization check: Only Admin or original Uploader can delete
        const isAdmin = user.role === 'admin' || user.id === 'admin_user';
        const isOwner = file.uploader && file.uploader.toLowerCase() === user.name.toLowerCase();

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { success: false, error: 'Forbidden. You do not have permission to delete this file.' },
                { status: 403 }
            );
        }

        // 3. Delete record securely via service role
        const { error: deleteError } = await supabaseServer
            .from('courses')
            .delete()
            .eq('id', fileId);

        if (deleteError) {
            console.error('Course deletion error:', deleteError);
            return NextResponse.json({ success: false, error: 'Failed to delete file record.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'File deleted successfully.' });

    } catch (error) {
        console.error('Course delete error:', error);
        return NextResponse.json({ success: false, error: 'Server error.' }, { status: 500 });
    }
}
