import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAuthenticatedUser, sanitizeString } from '@/lib/security';

// POST: Add one or multiple student records (Admin only)
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || (user.role !== 'admin' && user.id !== 'admin_user')) {
            return NextResponse.json(
                { success: false, error: 'Forbidden. Admin privileges required.' },
                { status: 403 }
            );
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON request' }, { status: 400 });
        }

        // Support either single student object or batch array
        const rawStudents = Array.isArray(body.students) 
            ? body.students 
            : body.id 
                ? [{ id: body.id, name: body.name, email: body.email }] 
                : [];

        if (!rawStudents.length) {
            return NextResponse.json(
                { success: false, error: 'At least one student record with a valid ID is required.' },
                { status: 400 }
            );
        }

        const cleanedStudents = rawStudents.map((s: any) => ({
            id: sanitizeString(s.id, 50).toUpperCase(),
            name: sanitizeString(s.name, 100) || 'Student',
            email: s.email ? sanitizeString(s.email, 254).toLowerCase() : null,
            login_count: 0,
            traffic_count: 0
        })).filter((s: any) => Boolean(s.id));

        if (!cleanedStudents.length) {
            return NextResponse.json({ success: false, error: 'No valid student IDs provided.' }, { status: 400 });
        }

        // Insert or ignore duplicates
        const { data, error } = await supabaseServer
            .from('students')
            .upsert(cleanedStudents, { onConflict: 'id', ignoreDuplicates: true })
            .select('id, name, email');

        if (error) {
            console.error('Admin student insert error:', error);
            return NextResponse.json({ success: false, error: 'Failed to insert student records into database.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed ${cleanedStudents.length} student record(s).`,
            inserted: data
        });

    } catch (err: any) {
        console.error('Admin student API error:', err);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE: Remove a student from roster (Admin only)
export async function DELETE(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || (user.role !== 'admin' && user.id !== 'admin_user')) {
            return NextResponse.json(
                { success: false, error: 'Forbidden. Admin privileges required.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const studentId = sanitizeString(searchParams.get('id'), 50).toUpperCase();

        if (!studentId) {
            return NextResponse.json({ success: false, error: 'Student ID is required.' }, { status: 400 });
        }

        const { error } = await supabaseServer
            .from('students')
            .delete()
            .eq('id', studentId);

        if (error) {
            console.error('Delete student error:', error);
            return NextResponse.json({ success: false, error: 'Failed to delete student.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Student ${studentId} removed successfully.`
        });

    } catch (err: any) {
        console.error('Admin delete student error:', err);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
