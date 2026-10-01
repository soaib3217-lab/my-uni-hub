import { cookies } from 'next/headers';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_for_dev_only')) {
    console.error("FATAL SECURITY WARNING: JWT_SECRET is using a default or empty value in production. Set a strong secret in environment variables!");
}

export interface AuthSession {
    id: string;
    role: 'admin' | 'student';
    name: string;
}

/**
 * Extract client IP address safely considering reverse proxies (Cloudflare, Vercel, Netlify).
 */
export function getClientIp(request: Request): string {
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // First entry in comma-separated list is the original client
        const clientIp = forwarded.split(',')[0]?.trim();
        if (clientIp) return clientIp;
    }

    return '127.0.0.1';
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses SHA-256 hashing first so strings of unequal length do not leak length information.
 */
export function timingSafeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const bufA = crypto.createHash('sha256').update(String(a)).digest();
    const bufB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * In-Memory Sliding Window Rate Limiter
 * Tracks requests per key with automatic garbage collection of expired entries.
 */
interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of rateLimitStore.entries()) {
            if (now > record.resetTime) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            success: true,
            remaining: limit - 1,
            resetSeconds: windowSeconds,
        };
    }

    if (record.count >= limit) {
        const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
        return {
            success: false,
            remaining: 0,
            resetSeconds,
        };
    }

    record.count += 1;
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
        success: true,
        remaining: limit - record.count,
        resetSeconds,
    };
}

/**
 * Strong password verification
 * - Must be at least 8 characters
 * - Must be at most 128 characters (prevents bcrypt DoS attacks)
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required.' };
    }
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long.' };
    }
    if (password.length > 128) {
        return { valid: false, error: 'Password must not exceed 128 characters.' };
    }
    return { valid: true };
}

/**
 * Validate and sanitize email format
 */
export function validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 254) return false;
    // Standard RFC-5322 compliant regex for web applications
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize text input: removes control characters and trims
 */
export function sanitizeString(input: unknown, maxLength = 255): string {
    if (typeof input !== 'string') return '';
    // Strip ASCII control characters except standard whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

/**
 * Securely verify the JWT session from cookies
 */
export async function getAuthenticatedUser(): Promise<AuthSession | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded || !decoded.id || !decoded.role) return null;

        return {
            id: String(decoded.id),
            role: decoded.role === 'admin' ? 'admin' : 'student',
            name: String(decoded.name || 'User'),
        };
    } catch {
        return null;
    }
}
