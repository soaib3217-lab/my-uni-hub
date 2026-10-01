import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { getClientIp, checkRateLimit, sanitizeString } from '@/lib/security';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function POST(request: Request) {
    const clientIp = getClientIp(request);

    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON format" }, { status: 400 });
        }

        const { id } = body;
        const studentId = sanitizeString(id, 50).toUpperCase();

        if (!studentId) {
            return NextResponse.json({ success: false, error: "Student ID is required." }, { status: 400 });
        }

        // 🛡️ Rate limit: Max 3 requests per 10 minutes per IP to prevent email spam & abuse
        const ipRateCheck = checkRateLimit(`forgot_ip_${clientIp}`, 3, 600);
        if (!ipRateCheck.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Too many password reset requests. Please wait ${Math.ceil(ipRateCheck.resetSeconds / 60)} minutes.` 
                }, 
                { 
                    status: 429,
                    headers: { 'Retry-After': String(ipRateCheck.resetSeconds) }
                }
            );
        }

        // Per-student rate limit: Max 3 requests per 10 minutes
        const idRateCheck = checkRateLimit(`forgot_id_${studentId}`, 3, 600);
        if (!idRateCheck.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "A reset code was already recently sent for this student ID. Please check your inbox or spam folder." 
                }, 
                { status: 429 }
            );
        }

        const { data: student, error } = await supabase
            .from('students')
            .select('email, id, name')
            .eq('id', studentId)
            .single();

        if (error || !student || !student.email) {
            return NextResponse.json({ 
                success: false, 
                error: "No account or registered email found for this ID." 
            }, { status: 404 });
        }

        // 🔒 Cryptographically secure 6-digit OTP (CSPRNG)
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otp_expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

        const { error: updateError } = await supabase
            .from('students')
            .update({ 
                otp_code: otp, 
                otp_expiry 
            })
            .eq('id', studentId);

        if (updateError) {
            console.error("OTP storage error:", updateError);
            return NextResponse.json({ success: false, error: "Unable to process reset request." }, { status: 500 });
        }

        // Mask recipient email for display safety (e.g., j***e@gmail.com)
        const [userPart, domainPart] = student.email.split('@');
        const maskedEmail = userPart.length > 2 
            ? `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`
            : `***@${domainPart}`;

        try {
            await transporter.sendMail({
                from: `"STAT.Notes Security" <${process.env.EMAIL_USER}>`,
                to: student.email,
                subject: 'Password Reset OTP - STAT.Notes',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
                        <h2 style="color: #38bdf8; margin-bottom: 8px;">Password Reset Verification</h2>
                        <p style="color: #94a3b8; font-size: 14px;">Hello ${student.name || 'Student'},</p>
                        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">You requested to reset your password for your STAT.Notes account. Use the one-time verification code below:</p>
                        <div style="background: #1e293b; padding: 18px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px dashed #38bdf8;">
                            <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #38bdf8; font-family: monospace;">${otp}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px;">This code will expire in <strong>10 minutes</strong>. If you did not request this reset, please ignore this email or notify your system administrator immediately.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error("Nodemailer transport error:", mailError);
            return NextResponse.json({ success: false, error: "Failed to deliver OTP email. Please try again later." }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: `OTP sent successfully to your registered email (${maskedEmail}). Please check inbox and spam folder.` 
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ success: false, error: "Server error occurred." }, { status: 500 });
    }
}
