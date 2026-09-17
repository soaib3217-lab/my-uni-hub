import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabaseServer } from '@/lib/supabaseServer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ success: false, user: null }, { status: 401 });
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userObj = { ...decoded };

        if (decoded.role === 'student' && decoded.id) {
            try {
                const { data: student } = await supabaseServer
                    .from('students')
                    .select('traffic_count, login_count')
                    .eq('id', decoded.id)
                    .single();
                if (student) {
                    userObj.traffic_count = student.traffic_count || 0;
                    userObj.login_count = student.login_count || 0;
                }
            } catch {
                // Graceful fallback to token data if db read fails
            }
        }

        return NextResponse.json({ success: true, user: userObj });
    } catch (error) {
        return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
}
