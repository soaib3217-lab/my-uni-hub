import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabaseServer } from '@/lib/supabaseServer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

interface DecodedToken {
    id: string;
    role?: string;
    name?: string;
}

export interface DeviceInfo {
    type: 'Mobile' | 'Desktop' | 'Tablet' | 'Unknown';
    os: string;
    browser: string;
    icon: string;
    label: string;
}

export function parseDeviceInfo(ua: string | null | undefined): DeviceInfo {
    if (!ua || ua === 'Unknown') {
        return {
            type: 'Unknown',
            os: 'Unknown OS',
            browser: 'Unknown Browser',
            icon: '💻',
            label: 'Unknown Device'
        };
    }

    // 1. Device Type
    let type: 'Mobile' | 'Desktop' | 'Tablet' = 'Desktop';
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
        type = 'Tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
        type = 'Mobile';
    }

    // 2. Operating System
    let os = 'Unknown OS';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/cros/i.test(ua)) os = 'ChromeOS';

    // 3. Browser
    let browser = 'Browser';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
    else if (/opera|opr\//i.test(ua)) browser = 'Opera';

    const icon = type === 'Mobile' ? '📱' : type === 'Tablet' ? '📟' : '💻';
    const label = `${os} • ${browser}`;

    return { type, os, browser, icon, label };
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 401 });
        }

        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid or expired session.' }, { status: 401 });
        }

        if (decoded.role !== 'admin' && decoded.id !== 'admin_user') {
            return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 });
        }

        // 1. Fetch all students
        const { data: students, error } = await supabaseServer
            .from('students')
            .select('*')
            .order('traffic_count', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('Admin Traffic Fetch Error:', error);
            return NextResponse.json({ success: false, error: 'Failed to retrieve student data.' }, { status: 500 });
        }

        // 2. Fetch traffic_logs to analyze all sessions across devices
        let allLogs: any[] = [];
        try {
            const { data: logs } = await supabaseServer
                .from('traffic_logs')
                .select('student_id, user_agent, visited_at')
                .order('visited_at', { ascending: false })
                .limit(2000);

            if (logs) {
                allLogs = logs;
            }
        } catch (logErr) {
            console.warn('Could not read from traffic_logs table:', logErr);
        }

        // Group session logs by student_id and calculate overall session traffic
        const studentDevicesMap: Record<string, {
            devices: Array<DeviceInfo & { count: number }>;
            latestDevice: DeviceInfo | null;
        }> = {};

        let mobileSessions = 0;
        let desktopSessions = 0;
        let tabletSessions = 0;
        const osCount: Record<string, number> = {};

        for (const log of allLogs) {
            if (!log.user_agent) continue;
            const parsed = parseDeviceInfo(log.user_agent);

            // Track overall session breakdown across all visits
            if (parsed.type === 'Mobile') mobileSessions++;
            else if (parsed.type === 'Desktop') desktopSessions++;
            else if (parsed.type === 'Tablet') tabletSessions++;

            if (parsed.os && parsed.os !== 'Unknown OS') {
                osCount[parsed.os] = (osCount[parsed.os] || 0) + 1;
            }

            // Track per student
            if (log.student_id) {
                if (!studentDevicesMap[log.student_id]) {
                    studentDevicesMap[log.student_id] = {
                        devices: [],
                        latestDevice: parsed
                    };
                }

                const existing = studentDevicesMap[log.student_id].devices.find(
                    d => d.os === parsed.os && d.browser === parsed.browser && d.type === parsed.type
                );
                if (existing) {
                    existing.count += 1;
                } else {
                    studentDevicesMap[log.student_id].devices.push({
                        ...parsed,
                        count: 1
                    });
                }
            }
        }

        // 3. Map students and resolve device information (both latest and all used)
        const safeStudents = (students || []).map(s => {
            const studentInfo = studentDevicesMap[s.id];
            let device = studentInfo?.latestDevice || parseDeviceInfo(s.last_user_agent);
            let devices = studentInfo?.devices || [];

            // Fallback for students whose traffic was recorded before traffic_logs table was populated
            if (devices.length === 0 && s.last_user_agent) {
                const dev = parseDeviceInfo(s.last_user_agent);
                if (dev.type !== 'Unknown') {
                    devices = [{ ...dev, count: s.traffic_count || 1 }];
                    if (dev.type === 'Mobile') mobileSessions += (s.traffic_count || 1);
                    else if (dev.type === 'Desktop') desktopSessions += (s.traffic_count || 1);
                    else if (dev.type === 'Tablet') tabletSessions += (s.traffic_count || 1);

                    if (dev.os && dev.os !== 'Unknown OS') {
                        osCount[dev.os] = (osCount[dev.os] || 0) + (s.traffic_count || 1);
                    }
                }
            }

            return {
                id: s.id,
                name: s.name,
                email: s.email || null,
                isRegistered: Boolean(s.email),
                login_count: Number(s.login_count || 0),
                traffic_count: Number(s.traffic_count || 0),
                last_visited_at: s.last_visited_at || null,
                device: device,
                devices: devices
            };
        });

        const totalStudents = safeStudents.length;
        const registeredCount = safeStudents.filter(s => s.isRegistered).length;
        const totalTraffic = safeStudents.reduce((acc, s) => acc + s.traffic_count, 0);
        const totalLogins = safeStudents.reduce((acc, s) => acc + s.login_count, 0);

        const totalSessionTracked = mobileSessions + desktopSessions + tabletSessions;
        const deviceBreakdown = {
            mobile: mobileSessions,
            desktop: desktopSessions,
            tablet: tabletSessions,
            totalSessions: totalSessionTracked,
            mobilePercent: totalSessionTracked > 0 ? Math.round((mobileSessions / totalSessionTracked) * 100) : 0,
            desktopPercent: totalSessionTracked > 0 ? Math.round((desktopSessions / totalSessionTracked) * 100) : 0,
            tabletPercent: totalSessionTracked > 0 ? Math.round((tabletSessions / totalSessionTracked) * 100) : 0,
            topOs: Object.entries(osCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        };

        return NextResponse.json({
            success: true,
            summary: {
                totalStudents,
                registeredCount,
                totalTraffic,
                totalLogins,
                mostActive: safeStudents[0] || null,
                deviceBreakdown
            },
            students: safeStudents
        });

    } catch (error) {
        console.error('Admin Traffic Route Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
