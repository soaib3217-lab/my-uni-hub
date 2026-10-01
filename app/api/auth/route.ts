import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { 
    getClientIp, 
    checkRateLimit, 
    timingSafeCompare, 
    validatePassword, 
    validateEmail, 
    sanitizeString 
} from '@/lib/security';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const ADMIN_SECRET = process.env.ADMIN_SECRET_PASSWORD || '';

export async function POST(request: Request) {
    const clientIp = getClientIp(request);

    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const { action, id, email, password } = body;

        if (!action || typeof action !== 'string') {
            return NextResponse.json({ success: false, error: "Missing or invalid action" }, { status: 400 });
        }

        // 🛡️ Rate Limiting: 10 attempts per minute per IP to prevent brute-force attacks
        const rateLimitKey = `auth_${clientIp}`;
        const rateCheck = checkRateLimit(rateLimitKey, 10, 60);
        if (!rateCheck.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Too many authentication attempts. Please wait ${rateCheck.resetSeconds} seconds before trying again.` 
                }, 
                { 
                    status: 429,
                    headers: { 'Retry-After': String(rateCheck.resetSeconds) }
                }
            );
        }

        const cleanId = sanitizeString(id, 50).toUpperCase();
        const cleanPassword = typeof password === 'string' ? password : '';

        // 👑 Check for Admin Access with constant-time comparison
        if (ADMIN_SECRET && action === 'login') {
            const isAdminId = timingSafeCompare(cleanId, 'ADMIN') || timingSafeCompare(cleanId, ADMIN_SECRET);
            const isAdminPass = timingSafeCompare(cleanPassword, ADMIN_SECRET) || (!cleanPassword && timingSafeCompare(cleanId, ADMIN_SECRET));

            if (isAdminId && isAdminPass) {
                const token = jwt.sign(
                    { id: 'admin_user', role: 'admin', name: 'Super Admin' },
                    JWT_SECRET,
                    { expiresIn: '7d', algorithm: 'HS256' }
                );

                const response = NextResponse.json({
                    success: true,
                    user: { id: 'admin_user', name: 'Super Admin', role: 'admin' }
                });

                response.cookies.set('auth_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 7
                });

                return response;
            }
        }

        if (!cleanId) {
            return NextResponse.json({ success: false, error: "Student ID is required." }, { status: 400 });
        }

        // Fetch student from database
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', cleanId)
            .single();

        if (error && error.code !== 'PGRST116') {
             console.error("Supabase Error:", error);
             return NextResponse.json({ success: false, error: "Authentication service unavailable" }, { status: 500 });
        }

        if (!student) {
            return NextResponse.json({ success: false, error: "Student ID not found in database." }, { status: 404 });
        }

        // --- REGISTRATION ---
        if (action === 'register') {
            if (student.password_hash) {
                return NextResponse.json({ success: false, error: "Account already registered for this ID. Please login." }, { status: 400 });
            }

            const cleanEmail = sanitizeString(email, 254).toLowerCase();
            if (!validateEmail(cleanEmail)) {
                return NextResponse.json({ success: false, error: "A valid email address is required for registration." }, { status: 400 });
            }

            const passwordValidation = validatePassword(cleanPassword);
            if (!passwordValidation.valid) {
                return NextResponse.json({ success: false, error: passwordValidation.error }, { status: 400 });
            }

            // Salt rounds = 12 for industry-standard password hashing resistance
            const password_hash = await bcrypt.hash(cleanPassword, 12);
            
            const { error: updateError } = await supabase
                .from('students')
                .update({ password_hash, email: cleanEmail })
                .eq('id', cleanId);

            if (updateError) {
                console.error("Registration DB error:", updateError);
                return NextResponse.json({ success: false, error: "Failed to complete registration." }, { status: 500 });
            }

            const token = jwt.sign(
                { id: student.id, role: 'student', name: student.name },
                JWT_SECRET,
                { expiresIn: '7d', algorithm: 'HS256' }
            );
            
            const response = NextResponse.json({
                success: true,
                user: { id: student.id, name: student.name, role: 'student' }
            });

            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7
            });

            return response;
        }

        // --- LOGIN ---
        if (action === 'login') {
            if (!student.password_hash) {
                 return NextResponse.json({ success: false, error: "Account not registered yet. Please create an account." }, { status: 400 });
            }

            if (!cleanPassword || cleanPassword.length > 128) {
                return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
            }

            const isMatch = await bcrypt.compare(cleanPassword, student.password_hash);
            if (!isMatch) {
                return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
            }

            // Increment login count
            const currentCount = student.login_count || 0;
            await supabase
                .from('students')
                .update({ login_count: currentCount + 1 })
                .eq('id', student.id);

            const token = jwt.sign(
                { id: student.id, role: 'student', name: student.name },
                JWT_SECRET,
                { expiresIn: '7d', algorithm: 'HS256' }
            );
            
            const response = NextResponse.json({
                success: true,
                user: { id: student.id, name: student.name, role: 'student' }
            });

            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7
            });

            return response;
        }

        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Server Auth Error:", error);
        return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
    }
}