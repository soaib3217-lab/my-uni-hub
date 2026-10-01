import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { 
    getClientIp, 
    checkRateLimit, 
    timingSafeCompare, 
    validatePassword, 
    sanitizeString 
} from '@/lib/security';

export async function POST(request: Request) {
    const clientIp = getClientIp(request);

    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON format" }, { status: 400 });
        }

        const { id, otp, newPassword } = body;
        const studentId = sanitizeString(id, 50).toUpperCase();
        const cleanOtp = sanitizeString(otp, 10);
        const cleanPassword = typeof newPassword === 'string' ? newPassword : '';

        if (!studentId || !cleanOtp || !cleanPassword) {
            return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
        }

        // 🛡️ Rate Limit: Max 5 verification attempts per 10 minutes per IP/student to prevent OTP brute-forcing
        const attemptKey = `reset_attempt_${studentId}_${clientIp}`;
        const rateCheck = checkRateLimit(attemptKey, 5, 600);
        if (!rateCheck.success) {
            // Invalidate the OTP in the database upon brute-force lockout
            await supabase
                .from('students')
                .update({ otp_code: null, otp_expiry: null })
                .eq('id', studentId);

            return NextResponse.json(
                { 
                    success: false, 
                    error: "Too many failed attempts. For security reasons, this reset code has been invalidated. Please request a new one." 
                }, 
                { status: 429 }
            );
        }

        // Validate password complexity
        const passValidation = validatePassword(cleanPassword);
        if (!passValidation.valid) {
            return NextResponse.json({ success: false, error: passValidation.error }, { status: 400 });
        }

        const { data: student, error } = await supabase
            .from('students')
            .select('otp_code, otp_expiry, id')
            .eq('id', studentId)
            .single();

        if (error || !student) {
            return NextResponse.json({ success: false, error: "Invalid Student ID" }, { status: 404 });
        }

        if (!student.otp_code || !student.otp_expiry) {
            return NextResponse.json({ success: false, error: "No active password reset request found. Please request a new code." }, { status: 400 });
        }

        // Check expiration
        if (new Date(student.otp_expiry).getTime() < Date.now()) {
            // Clear expired OTP
            await supabase
                .from('students')
                .update({ otp_code: null, otp_expiry: null })
                .eq('id', studentId);

            return NextResponse.json({ success: false, error: "This OTP has expired. Please request a new one." }, { status: 400 });
        }

        // Constant-time OTP comparison against timing attacks
        const isOtpValid = timingSafeCompare(student.otp_code, cleanOtp);
        if (!isOtpValid) {
            return NextResponse.json({ 
                success: false, 
                error: `Invalid OTP. ${rateCheck.remaining} attempt(s) remaining before code is invalidated.` 
            }, { status: 400 });
        }

        // Hash new password with 12 rounds
        const password_hash = await bcrypt.hash(cleanPassword, 12);

        // Update password and clear OTP atomically
        const { error: updateError } = await supabase
            .from('students')
            .update({ 
                password_hash, 
                otp_code: null, 
                otp_expiry: null 
            })
            .eq('id', studentId);

        if (updateError) {
            console.error("Password update error:", updateError);
            throw updateError;
        }

        return NextResponse.json({ success: true, message: "Password reset successful! You may now log in with your new password." });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ success: false, error: "Server error occurred during password reset." }, { status: 500 });
    }
}
