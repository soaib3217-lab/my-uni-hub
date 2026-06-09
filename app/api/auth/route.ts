import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Supabase connection for the server
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, id, email, password } = body;

        // 👑 Check for Admin First
        const actualAdminId = process.env.ADMIN_SECRET_PASSWORD;

        if (id === actualAdminId && action === 'login') {
            const token = jwt.sign({ id: 'admin_user', role: 'admin', name: 'Super Admin' }, JWT_SECRET, { expiresIn: '7d' });
            const response = NextResponse.json({
                success: true,
                user: { id: 'admin_user', name: 'Super Admin', role: 'admin' }
            });
            response.cookies.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
            return response;
        }

        // Fetch student from database
        const studentId = id ? id.trim().toUpperCase() : '';
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (error && error.code !== 'PGRST116') {
             console.error("Supabase Error:", error);
             return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
        }

        if (!student) {
            return NextResponse.json({ success: false, error: "Student ID not found in database." }, { status: 404 });
        }

        if (action === 'register') {
            if (student.password_hash) {
                return NextResponse.json({ success: false, error: "Account already registered for this ID. Please login." }, { status: 400 });
            }

            if (!email || !password) {
                 return NextResponse.json({ success: false, error: "Email and password are required for registration." }, { status: 400 });
            }

            const password_hash = await bcrypt.hash(password, 10);
            
            const { error: updateError } = await supabase
                .from('students')
                .update({ password_hash, email })
                .eq('id', studentId);

            if (updateError) throw updateError;

            const token = jwt.sign({ id: student.id, role: 'student', name: student.name }, JWT_SECRET, { expiresIn: '7d' });
            
            const response = NextResponse.json({
                success: true,
                user: { id: student.id, name: student.name, role: 'student' }
            });
            response.cookies.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
            return response;
        }

        if (action === 'login') {
            if (!student.password_hash) {
                 return NextResponse.json({ success: false, error: "Account not registered yet. Please create an account." }, { status: 400 });
            }

            const isMatch = await bcrypt.compare(password, student.password_hash);
            if (!isMatch) {
                return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
            }

            // Increment login count
            const currentCount = student.login_count || 0;
            await supabase
                .from('students')
                .update({ login_count: currentCount + 1 })
                .eq('id', student.id);

            const token = jwt.sign({ id: student.id, role: 'student', name: student.name }, JWT_SECRET, { expiresIn: '7d' });
            
            const response = NextResponse.json({
                success: true,
                user: { id: student.id, name: student.name, role: 'student' }
            });
            response.cookies.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
            return response;
        }

        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Server Auth Error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}