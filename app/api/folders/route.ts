import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAuthenticatedUser, sanitizeString } from '@/lib/security';

// POST: Create a new course folder (Requires authentication)
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. You must be logged in to create folders.' },
                { status: 401 }
            );
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON request' }, { status: 400 });
        }

        const code = sanitizeString(body.code, 50).toUpperCase();
        const year = sanitizeString(body.year, 20);
        const semester = sanitizeString(body.semester, 20);

        if (!code) {
            return NextResponse.json({ success: false, error: 'Course code is required.' }, { status: 400 });
        }

        // Prevent duplicate folder codes
        const { data: existing } = await supabaseServer
            .from('folders')
            .select('id')
            .eq('code', code)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: 'A folder with this course code already exists.' }, { status: 409 });
        }

        const { data, error } = await supabaseServer.from('folders').insert({
            code,
            year: year || 'Year 1',
            semester: semester || 'Semester 1'
        }).select().single();

        if (error) {
            console.error('Folder creation error:', error);
            return NextResponse.json({ success: false, error: 'Failed to create folder.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, folder: data });

    } catch (error) {
        console.error('Folder API error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
