import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { id, otp, newPassword } = await request.json();

        if (!id || !otp || !newPassword) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const studentId = id.trim().toUpperCase();

        const { data: student, error } = await supabase
            .from('students')
            .select('otp_code, otp_expiry')
            .eq('id', studentId)
            .single();

        if (error || !student) {
            return NextResponse.json({ success: false, error: "Invalid Student ID" }, { status: 404 });
        }

        if (student.otp_code !== otp) {
            return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
        }

        if (new Date(student.otp_expiry) < new Date()) {
            return NextResponse.json({ success: false, error: "OTP has expired" }, { status: 400 });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);

        const { error: updateError } = await supabase
            .from('students')
            .update({ password_hash, otp_code: null, otp_expiry: null })
            .eq('id', studentId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: "Password reset successful" });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
