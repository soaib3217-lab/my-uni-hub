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
import { 
    isAdminDeviceTrusted, 
    sendAdminLoginOtp, 
    verifyAdminLoginOtp, 
    bindCurrentAdminDevice 
} from '@/lib/adminSecurity';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const ADMIN_SECRET = process.env.ADMIN_SECRET_PASSWORD || '';

export async function POST(request: Request) {
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown Device';

    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const { action, id, email, password, otp, challengeToken } = body;

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

        // 🔐 1. ADMIN 2FA OTP VERIFICATION & AUTOMATIC DEVICE BINDING
        if (action === 'admin_verify_otp') {
            const cleanOtp = sanitizeString(otp, 10);
            if (!cleanOtp) {
                return NextResponse.json({ success: false, error: "Verification code is required." }, { status: 400 });
            }

            // Extract challenge token from request body or secure HTTP-only cookie
            const cookieHeader = request.headers.get('cookie') || '';
            const matchChallenge = cookieHeader.match(/(?:^|;\s*)admin_otp_challenge=([^;]+)/);
            const activeChallenge = challengeToken || (matchChallenge ? decodeURIComponent(matchChallenge[1].trim()) : undefined);

            const isValid = verifyAdminLoginOtp(cleanOtp, activeChallenge);
            if (!isValid) {
                return NextResponse.json({ success: false, error: "Invalid or expired verification code. Please try again." }, { status: 401 });
            }

            // Issue Super Admin session token
            const token = jwt.sign(
                { id: 'admin_user', role: 'admin', name: 'Super Admin' },
                JWT_SECRET,
                { expiresIn: '7d', algorithm: 'HS256' }
            );

            const response = NextResponse.json({
                success: true,
                user: { id: 'admin_user', name: 'Super Admin', role: 'admin' },
                deviceBound: true,
                message: "Device successfully verified and bound."
            });

            // Clear the used challenge cookie
            response.cookies.delete('admin_otp_challenge');

            // Set Admin session cookie
            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7
            });

            // Automatically bind this new device for 1 year (no OTP on future logins)
            await bindCurrentAdminDevice(response, userAgent, clientIp);

            return response;
        }

        // 🔄 ADMIN RESEND OTP
        if (action === 'admin_resend_otp') {
            const otpRes = await sendAdminLoginOtp(clientIp);
            if (!otpRes.success) {
                return NextResponse.json({ success: false, error: otpRes.error || "Failed to resend code" }, { status: 500 });
            }

            const response = NextResponse.json({
                success: true,
                challengeToken: otpRes.challengeToken,
                message: `New code dispatched to ${otpRes.maskedEmail}`
            });

            if (otpRes.challengeToken) {
                response.cookies.set('admin_otp_challenge', otpRes.challengeToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 600
                });
            }

            return response;
        }

        const cleanId = sanitizeString(id, 50).toUpperCase();
        const cleanPassword = typeof password === 'string' ? password : '';

        // 👑 2. CHECK FOR ADMIN ACCESS WITH HARDENED 2FA & DEVICE BINDING
        if (ADMIN_SECRET && action === 'login') {
            const isAdminId = timingSafeCompare(cleanId, 'ADMIN') || timingSafeCompare(cleanId, ADMIN_SECRET);
            const isAdminPass = timingSafeCompare(cleanPassword, ADMIN_SECRET) || (!cleanPassword && timingSafeCompare(cleanId, ADMIN_SECRET));

            if (isAdminId && isAdminPass) {
                // Check if this device is already trusted / bound
                const isDeviceTrusted = await isAdminDeviceTrusted(request);

                if (isDeviceTrusted) {
                    console.log(`[Admin Auth] ✓ Recognized bound/trusted device from ${clientIp}. Logging in without OTP.`);
                    const token = jwt.sign(
                        { id: 'admin_user', role: 'admin', name: 'Super Admin' },
                        JWT_SECRET,
                        { expiresIn: '7d', algorithm: 'HS256' }
                    );

                    const response = NextResponse.json({
                        success: true,
                        user: { id: 'admin_user', name: 'Super Admin', role: 'admin' },
                        deviceTrusted: true
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

                // New / Untrusted Device: Send OTP to admin email from .env.local
                console.log(`[Admin Auth] ⚠️ New device detected from ${clientIp}. Dispatching 2FA OTP to admin email...`);
                const otpRes = await sendAdminLoginOtp(clientIp);

                if (!otpRes.success) {
                    return NextResponse.json({
                        success: false,
                        error: otpRes.error || "Failed to dispatch admin verification code to email."
                    }, { status: 500 });
                }

                const response = NextResponse.json({
                    success: true,
                    requireOtp: true,
                    role: 'admin',
                    email: otpRes.maskedEmail,
                    challengeToken: otpRes.challengeToken,
                    message: `Security code sent to admin email (${otpRes.maskedEmail}). Please enter code to verify & bind this device.`
                });

                if (otpRes.challengeToken) {
                    response.cookies.set('admin_otp_challenge', otpRes.challengeToken, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 600
                    });
                }

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