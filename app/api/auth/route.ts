import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🔌 Initialize Supabase connection for the server
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        // 👑 1. Check for Admin First (Still hidden in .env.local)
        const actualAdminId = process.env.ADMIN_SECRET_PASSWORD;

        if (id === actualAdminId) {
            return NextResponse.json({
                success: true,
                user: {
                    id: 'admin_user',
                    name: 'Super Admin',
                    role: 'admin' 
                }
            });
        }

        // 🎓 2. Check the Supabase Database for the Student ID
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single(); // .single() grabs exactly one match

        if (error && error.code !== 'PGRST116') {
             // PGRST116 just means "no rows found", any other error is a real database issue
             console.error("Supabase Error:", error);
        }

        // 🟢 3. If student exists in the database, log them in!
        if (student) {
            return NextResponse.json({
                success: true,
                user: {
                    id: student.id,
                    name: student.name,
                    role: 'student'
                }
            });
        }

        // ❌ 4. If not Admin AND not in the database, reject.
        return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 401 });

    } catch (error) {
        console.error("Server Auth Error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}