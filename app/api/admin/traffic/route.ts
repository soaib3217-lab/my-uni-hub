import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabaseServer } from '@/lib/supabaseServer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

interface DecodedToken {
    id: string;
    role?: string;
    name?: string;
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 401 });
        }

        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid or expired session.' }, { status: 401 });
        }

        if (decoded.role !== 'admin' && decoded.id !== 'admin_user') {
            return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        // Fetch all students data
        const { data: students, error } = await supabaseServer
            .from('students')
            .select('id, name, email, login_count, traffic_count, last_visited_at')
            .order('traffic_count', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('Admin Traffic Fetch Error:', error);
            return NextResponse.json({ success: false, error: 'Failed to retrieve student data.' }, { status: 500 });
        }

        const safeStudents = (students || []).map(s => ({
            id: s.id,
            name: s.name,
            email: s.email || null,
            isRegistered: Boolean(s.email),
            login_count: Number(s.login_count || 0),
            traffic_count: Number(s.traffic_count || 0),
            last_visited_at: s.last_visited_at || null
        }));

        const totalStudents = safeStudents.length;
        const registeredCount = safeStudents.filter(s => s.isRegistered).length;
        const totalTraffic = safeStudents.reduce((acc, s) => acc + s.traffic_count, 0);
        const totalLogins = safeStudents.reduce((acc, s) => acc + s.login_count, 0);

        return NextResponse.json({
            success: true,
            summary: {
                totalStudents,
                registeredCount,
                totalTraffic,
                totalLogins,
                mostActive: safeStudents[0] || null
            },
            students: safeStudents
        });

    } catch (error) {
        console.error('Admin Traffic Route Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
