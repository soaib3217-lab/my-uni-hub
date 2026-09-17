import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabaseServer } from '@/lib/supabaseServer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

interface DecodedToken {
    id: string;
    name?: string;
    role?: string;
}

// POST: Record a website visit / traffic open for the current logged-in user
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'No active session found.' },
                { status: 401 }
            );
        }

        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired session.' },
                { status: 401 }
            );
        }

        // Admin accounts are not university students, so skip incrementing student traffic
        if (decoded.role === 'admin' || decoded.id === 'admin_user') {
            return NextResponse.json({
                success: true,
                message: 'Admin session verified (traffic count not applicable).',
                role: 'admin'
            });
        }

        const studentId = decoded.id;
        const now = new Date().toISOString();

        // 1. Fetch current student record
        const { data: student, error: fetchError } = await supabaseServer
            .from('students')
            .select('id, traffic_count, login_count, name')
            .eq('id', studentId)
            .single();

        if (fetchError || !student) {
            return NextResponse.json(
                { success: false, error: 'Student record not found.' },
                { status: 404 }
            );
        }

        const newTrafficCount = (student.traffic_count || 0) + 1;

        // 2. Update student traffic count and last visited timestamp
        const { error: updateError } = await supabaseServer
            .from('students')
            .update({
                traffic_count: newTrafficCount,
                last_visited_at: now
            })
            .eq('id', studentId);

        if (updateError) {
            console.error('Failed to update student traffic count:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update traffic count.' },
                { status: 500 }
            );
        }

        // 3. Insert into traffic_logs for audit history (non-blocking if table is not yet created)
        try {
            const userAgent = request.headers.get('user-agent') || 'Unknown';
            await supabaseServer
                .from('traffic_logs')
                .insert({
                    student_id: studentId,
                    visited_at: now,
                    user_agent: userAgent
                });
        } catch (logErr) {
            // Non-fatal if traffic_logs migration has not run yet
            console.warn('Could not insert to traffic_logs table (safe to ignore if table pending migration):', logErr);
        }

        return NextResponse.json({
            success: true,
            traffic_count: newTrafficCount,
            last_visited_at: now
        });

    } catch (error) {
        console.error('Traffic API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

// GET: Retrieve traffic info for the currently logged-in student
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ success: false, user: null }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

        if (decoded.role === 'admin' || decoded.id === 'admin_user') {
            return NextResponse.json({ success: true, role: 'admin' });
        }

        const { data: student, error } = await supabaseServer
            .from('students')
            .select('id, name, traffic_count, login_count, last_visited_at')
            .eq('id', decoded.id)
            .single();

        if (error || !student) {
            return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            student: {
                id: student.id,
                name: student.name,
                traffic_count: student.traffic_count || 0,
                login_count: student.login_count || 0,
                last_visited_at: student.last_visited_at || null
            }
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
}
