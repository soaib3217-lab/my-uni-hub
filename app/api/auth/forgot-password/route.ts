import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function POST(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Student ID is required" }, { status: 400 });
        }

        const studentId = id.trim().toUpperCase();

        const { data: student, error } = await supabase
            .from('students')
            .select('email, id, name')
            .eq('id', studentId)
            .single();

        if (error || !student || !student.email) {
            return NextResponse.json({ success: false, error: "No account or email found for this ID" }, { status: 404 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        const { error: updateError } = await supabase
            .from('students')
            .update({ otp_code: otp, otp_expiry })
            .eq('id', studentId);

        if (updateError) throw updateError;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: student.email,
            subject: 'Password Reset OTP - STAT.Notes',
            html: `<div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hello ${student.name},</h2>
                    <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                    <p>This code is valid for 10 minutes.</p>
                   </div>`
        });

        return NextResponse.json({ success: true, message: "OTP sent to your registered email" });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
