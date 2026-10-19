import crypto from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const ADMIN_DEVICE_COOKIE = 'admin_device_token';
const FALLBACK_DEVICES_FILE = path.join(process.cwd(), '.admin_trusted_devices.json');
const FALLBACK_OTP_FILE = path.join(process.cwd(), '.admin_pending_otp.json');

// Reusable nodemailer transporter using .env.local credentials
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Local fallback helpers for trusted devices in case Supabase table doesn't exist yet
 */
function readLocalTrustedDevices(): Set<string> {
    try {
        if (fs.existsSync(FALLBACK_DEVICES_FILE)) {
            const data = JSON.parse(fs.readFileSync(FALLBACK_DEVICES_FILE, 'utf-8'));
            return new Set(Array.isArray(data) ? data : []);
        }
    } catch (e) {
        console.warn("[adminSecurity] Could not read local devices file:", e);
    }
    return new Set();
}

function saveLocalTrustedDevice(token: string) {
    try {
        const set = readLocalTrustedDevices();
        set.add(token);
        fs.writeFileSync(FALLBACK_DEVICES_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8');
    } catch (e) {
        console.warn("[adminSecurity] Could not write local devices file:", e);
    }
}

/**
 * Check if the incoming request comes from an already bound / trusted admin device
 */
export async function isAdminDeviceTrusted(request: Request): Promise<boolean> {
    try {
        // 1. Extract device token from cookie or header
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_DEVICE_COOKIE}=([^;]+)`));
        const deviceToken = match ? decodeURIComponent(match[1].trim()) : request.headers.get('x-admin-device-token');

        if (!deviceToken) {
            return false;
        }

        // 2. Check local fallback file first (instant 0ms response)
        const localDevices = readLocalTrustedDevices();
        if (localDevices.has(deviceToken)) {
            return true;
        }

        // 3. Check Supabase database table
        const { data, error } = await supabase
            .from('admin_trusted_devices')
            .select('id, device_token')
            .eq('device_token', deviceToken)
            .single();

        if (data && !error) {
            // Cache locally for faster subsequent checks
            saveLocalTrustedDevice(deviceToken);
            return true;
        }

        return false;
    } catch (err) {
        console.warn("[adminSecurity] Error checking trusted device:", err);
        return false;
    }
}

/**
 * Generate a 6-digit security OTP and email it to the admin email from .env.local
 */
export async function sendAdminLoginOtp(clientIp = 'unknown'): Promise<{ success: boolean; maskedEmail: string; error?: string }> {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (!adminEmail) {
        return { success: false, maskedEmail: '', error: "Admin email not configured in .env.local (EMAIL_USER or ADMIN_EMAIL)." };
    }

    // 🔒 Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Persist pending OTP
    try {
        fs.writeFileSync(FALLBACK_OTP_FILE, JSON.stringify({ otp, expiry, createdAt: Date.now() }), 'utf-8');
    } catch (err) {
        console.error("[adminSecurity] Failed to save pending OTP:", err);
    }

    // Mask recipient email (e.g. b***e@gmail.com)
    const [userPart, domainPart] = adminEmail.split('@');
    const maskedEmail = userPart.length > 2 
        ? `${userPart[0]}***${userPart[userPart.length - 1]}@${domainPart}`
        : `***@${domainPart}`;

    try {
        console.log(`[adminSecurity] Sending Admin 2FA OTP to ${adminEmail}...`);
        await transporter.sendMail({
            from: `"STAT.Notes Security" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `🔐 STAT.Notes Admin - Device Verification Code: ${otp}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #080d1a; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(6,182,212,0.3); box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; background: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.4); color: #38bdf8; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
                            Super Admin 2FA Authentication
                        </span>
                        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 14px; margin-bottom: 6px; letter-spacing: -0.5px;">
                            New Device Verification
                        </h2>
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                            A login attempt was initiated for the Administrator account from IP: <code style="color: #38bdf8;">${clientIp}</code>
                        </p>
                    </div>

                    <div style="background: rgba(15,23,42,0.8); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; border: 1px dashed rgba(56,189,248,0.5);">
                        <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; font-weight: bold;">
                            Your 6-Digit One-Time Code
                        </p>
                        <span style="font-size: 38px; letter-spacing: 12px; font-weight: 900; color: #38bdf8; font-family: 'Courier New', Courier, monospace; display: block; padding-left: 12px;">
                            ${otp}
                        </span>
                    </div>

                    <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 14px; margin-bottom: 20px;">
                        <p style="color: #34d399; font-size: 12px; margin: 0; line-height: 1.5;">
                            ✨ <strong>Automatic Device Binding:</strong> Once you verify this OTP, this browser will be permanently remembered as a trusted device. Future logins from this device will not prompt for an OTP.
                        </p>
                    </div>

                    <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
                        This code will expire in <strong>10 minutes</strong>. If you did not initiate this login, someone is attempting to access your admin portal.
                    </p>
                </div>
            `
        });
        console.log(`[adminSecurity] ✓ Admin OTP email successfully delivered to ${adminEmail}`);
        return { success: true, maskedEmail };
    } catch (err: any) {
        console.error("[adminSecurity] ❌ Failed to send admin OTP email:", err);
        return { success: false, maskedEmail, error: err.message || "Failed to send email" };
    }
}

/**
 * Verify submitted OTP against the active pending admin OTP
 */
export function verifyAdminLoginOtp(submittedOtp: string): boolean {
    try {
        if (!fs.existsSync(FALLBACK_OTP_FILE)) {
            return false;
        }

        const data = JSON.parse(fs.readFileSync(FALLBACK_OTP_FILE, 'utf-8'));
        if (!data || !data.otp || !data.expiry) {
            return false;
        }

        if (Date.now() > data.expiry) {
            console.warn("[adminSecurity] Submitted OTP has expired.");
            fs.unlinkSync(FALLBACK_OTP_FILE);
            return false;
        }

        const isValid = data.otp.trim() === submittedOtp.trim();
        if (isValid) {
            // Consume OTP so it cannot be re-used
            try {
                fs.unlinkSync(FALLBACK_OTP_FILE);
            } catch {}
            return true;
        }

        return false;
    } catch (err) {
        console.error("[adminSecurity] Error verifying OTP:", err);
        return false;
    }
}

/**
 * Automatically bind the current device as a trusted device for 1 year
 */
export async function bindCurrentAdminDevice(
    response: NextResponse, 
    userAgent = 'Unknown Device', 
    ipAddress = 'unknown'
): Promise<string> {
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // 1. Save in local fallback storage
    saveLocalTrustedDevice(deviceToken);

    // 2. Save in Supabase database
    try {
        await supabase
            .from('admin_trusted_devices')
            .insert({
                device_token: deviceToken,
                user_agent: userAgent,
                ip_address: ipAddress,
                last_used_at: new Date().toISOString()
            });
    } catch (err) {
        console.warn("[adminSecurity] Database device bind warning (local device bound):", err);
    }

    // 3. Set persistent 1-year device cookie on the response
    response.cookies.set(ADMIN_DEVICE_COOKIE, deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 // 1 year binding
    });

    console.log(`[adminSecurity] ✓ Device successfully bound with token: ${deviceToken.slice(0, 10)}...`);
    return deviceToken;
}
