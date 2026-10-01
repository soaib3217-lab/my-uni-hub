import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from '@/lib/security';

// POST: Record a website visit / traffic open for the current logged-in user
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. No active session found.' },
                { status: 401 }
            );
        }

        // Admin sessions do not count towards student traffic
        if (user.role === 'admin' || user.id === 'admin_user') {
            return NextResponse.json({
                success: true,
                message: 'Admin session verified (traffic count not applicable).',
                role: 'admin'
            });
        }

        const clientIp = getClientIp(request);

        // 🛡️ Rate limit: Max 1 traffic log every 30 seconds per student to prevent counter inflation
        const rateCheck = checkRateLimit(`traffic_${user.id}_${clientIp}`, 1, 30);
        if (!rateCheck.success) {
            return NextResponse.json({
                success: true,
                message: 'Visit already recorded for current session window.'
            });
        }

        const studentId = user.id;
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
        const rawUserAgent = request.headers.get('user-agent') || 'Unknown';
        const userAgent = sanitizeString(rawUserAgent, 300);

        // 2. Update student traffic count, last visited timestamp, and device user agent
        let { error: updateError } = await supabaseServer
            .from('students')
            .update({
                traffic_count: newTrafficCount,
                last_visited_at: now,
                last_user_agent: userAgent
            })
            .eq('id', studentId);

        // Fallback in case last_user_agent column has not been added to Supabase yet
        if (updateError) {
            const fallback = await supabaseServer
                .from('students')
                .update({
                    traffic_count: newTrafficCount,
                    last_visited_at: now
                })
                .eq('id', studentId);
            updateError = fallback.error;
        }

        if (updateError) {
            console.error('Failed to update student traffic count:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update traffic count.' },
                { status: 500 }
            );
        }

        // 3. Insert into traffic_logs for audit history
        try {
            await supabaseServer
                .from('traffic_logs')
                .insert({
                    student_id: studentId,
                    visited_at: now,
                    user_agent: userAgent
                });
        } catch (logErr) {
            // Non-fatal if traffic_logs table has not been migrated yet
            console.warn('Could not insert to traffic_logs table:', logErr);
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
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ success: false, user: null }, { status: 401 });
        }

        if (user.role === 'admin' || user.id === 'admin_user') {
            return NextResponse.json({ success: true, role: 'admin' });
        }

        const { data: student, error } = await supabaseServer
            .from('students')
            .select('id, name, traffic_count, login_count, last_visited_at')
            .eq('id', user.id)
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
