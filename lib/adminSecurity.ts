import crypto from 'crypto';
import jwt from 'jsonwebtoken';
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

function getSecuritySecret(): string {
    return process.env.JWT_SECRET || process.env.ADMIN_SECRET_PASSWORD || 'statnotes_secure_admin_jwt_secret_2026';
}

/**
 * Local fallback helpers for trusted devices in case Supabase table doesn't exist yet
 */
function readLocalTrustedDevices(): Set<string> {
    try {
        if (fs.existsSync(FALLBACK_DEVICES_FILE)) {
            const data = JSON.parse(fs.readFileSync(FALLBACK_DEVICES_FILE, 'utf-8'));
            return new Set(Array.isArray(data) ? data : []);
        }
    } catch {
        // Expected on read-only serverless filesystems (e.g. Netlify/Vercel)
    }
    return new Set();
}

function saveLocalTrustedDevice(token: string) {
    try {
        const set = readLocalTrustedDevices();
        set.add(token);
        fs.writeFileSync(FALLBACK_DEVICES_FILE, JSON.stringify(Array.from(set), null, 2), 'utf-8');
    } catch {
        // Expected on read-only serverless filesystems (e.g. Netlify/Vercel)
    }
}

/**
 * Check if the incoming request comes from an already bound / trusted admin device
 * Uses cryptographically signed JWT tokens (serverless native) + fallback storage
 */
export async function isAdminDeviceTrusted(request: Request): Promise<boolean> {
    try {
        const secret = getSecuritySecret();

        // 1. Extract device token from cookie or header
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_DEVICE_COOKIE}=([^;]+)`));
        const deviceToken = match ? decodeURIComponent(match[1].trim()) : request.headers.get('x-admin-device-token');

        if (!deviceToken) {
            return false;
        }

        // 2. 🌐 Primary Serverless Verification: Cryptographically signed 1-year JWT device token
        try {
            const decoded = jwt.verify(deviceToken, secret) as any;
            if (decoded && decoded.type === 'admin_trusted_device') {
                return true;
            }
        } catch {
            // Not a valid JWT or expired, check database / fallback
        }

        // 3. Check local fallback file (for local dev)
        const localDevices = readLocalTrustedDevices();
        if (localDevices.has(deviceToken)) {
            return true;
        }

        // 4. Check Supabase database table
        try {
            const { data, error } = await supabase
                .from('admin_trusted_devices')
                .select('id, device_token')
                .eq('device_token', deviceToken)
                .single();

            if (data && !error) {
                return true;
            }
        } catch {
            // Table might not exist yet; safe to ignore
        }

        return false;
    } catch (err) {
        console.warn("[adminSecurity] Error checking trusted device:", err);
        return false;
    }
}

/**
 * Generate a 6-digit security OTP, email it to the admin email from .env.local,
 * and generate a stateless cryptographic challenge token (Netlify / Serverless safe).
 */
export async function sendAdminLoginOtp(clientIp = 'unknown'): Promise<{ 
    success: boolean; 
    maskedEmail: string; 
    challengeToken?: string;
    error?: string 
}> {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (!adminEmail) {
        return { success: false, maskedEmail: '', error: "Admin email not configured in .env.local (EMAIL_USER or ADMIN_EMAIL)." };
    }

    // 🔒 Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    const secret = getSecuritySecret();

    // 🌐 Serverless-Native Challenge Token:
    // This allows verification to succeed across DIFFERENT lambda instances / containers on Netlify
    // without depending on a shared disk.
    const otpHash = crypto.createHmac('sha256', secret).update(otp).digest('hex');
    const challengeToken = jwt.sign(
        {
            type: 'admin_login_otp_challenge',
            otpHash,
            createdAt: Date.now()
        },
        secret,
        { expiresIn: '10m' }
    );

    // Local file fallback (works on local development server)
    try {
        fs.writeFileSync(FALLBACK_OTP_FILE, JSON.stringify({ otp, expiry, createdAt: Date.now() }), 'utf-8');
    } catch {
        // Ignored on read-only serverless filesystems
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
        return { success: true, maskedEmail, challengeToken };
    } catch (err: any) {
        console.error("[adminSecurity] ❌ Failed to send admin OTP email:", err);
        return { success: false, maskedEmail, error: err.message || "Failed to send email" };
    }
}

/**
 * Verify submitted OTP against the active challenge token (Serverless / Netlify)
 * or local fallback file
 */
export function verifyAdminLoginOtp(submittedOtp: string, challengeToken?: string): boolean {
    const cleanOtp = (submittedOtp || '').trim();
    if (!cleanOtp) return false;

    const secret = getSecuritySecret();

    // 1. 🌐 Primary: Stateless Cryptographic Verification (Works on Netlify & Serverless Lambdas)
    if (challengeToken) {
        try {
            const decoded = jwt.verify(challengeToken, secret) as any;
            if (decoded && decoded.type === 'admin_login_otp_challenge' && decoded.otpHash) {
                const computedHash = crypto.createHmac('sha256', secret).update(cleanOtp).digest('hex');
                const isMatch = crypto.timingSafeEqual(
                    Buffer.from(computedHash, 'hex'),
                    Buffer.from(decoded.otpHash, 'hex')
                );
                if (isMatch) {
                    console.log(`[adminSecurity] ✓ Challenge token OTP verified successfully on serverless instance.`);
                    try {
                        if (fs.existsSync(FALLBACK_OTP_FILE)) fs.unlinkSync(FALLBACK_OTP_FILE);
                    } catch {}
                    return true;
                }
            }
        } catch (err: any) {
            console.warn("[adminSecurity] Challenge token validation failed:", err?.message || err);
        }
    }

    // 2. Fallback: Local file check (for local development)
    try {
        if (fs.existsSync(FALLBACK_OTP_FILE)) {
            const data = JSON.parse(fs.readFileSync(FALLBACK_OTP_FILE, 'utf-8'));
            if (data && data.otp && data.expiry && Date.now() <= data.expiry) {
                if (data.otp.trim() === cleanOtp) {
                    try { fs.unlinkSync(FALLBACK_OTP_FILE); } catch {}
                    return true;
                }
            }
        }
    } catch {}

    return false;
}

/**
 * Automatically bind the current device as a trusted device for 1 year
 * Generates a signed JWT device token stored in a persistent cookie
 */
export async function bindCurrentAdminDevice(
    response: NextResponse, 
    userAgent = 'Unknown Device', 
    ipAddress = 'unknown'
): Promise<string> {
    const secret = getSecuritySecret();

    // 🌐 Generate cryptographically signed 1-year JWT device token (serverless resilient)
    const deviceToken = jwt.sign(
        {
            type: 'admin_trusted_device',
            boundAt: Date.now(),
            ua: userAgent.slice(0, 100),
            ip: ipAddress
        },
        secret,
        { expiresIn: '365d' }
    );

    // 1. Save in local fallback storage (for dev)
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
        // Table might not exist yet; safe to ignore because JWT signature validates the device
    }

    // 3. Set persistent 1-year device cookie on the response
    response.cookies.set(ADMIN_DEVICE_COOKIE, deviceToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60 // 1 year binding
    });

    console.log(`[adminSecurity] ✓ Device successfully bound with serverless-safe token: ${deviceToken.slice(0, 15)}...`);
    return deviceToken;
}
