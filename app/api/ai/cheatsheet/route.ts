import { NextResponse } from "next/server";
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from "@/lib/security";
import { getCachedAiContent, saveCachedAiContent, generateCheatSheetContent } from "@/lib/aiService";

export async function POST(req: Request) {
    const clientIp = getClientIp(req);

    // 🔒 1. Session verification & Rate Limiting
    const user = await getAuthenticatedUser();
    const rateLimitKey = `cheatsheet_${user?.id || 'guest'}_${clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, 15, 60);

    if (!rateCheck.success) {
        return NextResponse.json(
            { error: `Rate limit reached. Please wait ${rateCheck.resetSeconds}s before generating another cheat sheet.` },
            { status: 429 }
        );
    }

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
        }

        const courseId = body.courseId != null ? String(body.courseId).trim() : '';
        const title = sanitizeString(body.title, 200);
        const courseCode = sanitizeString(body.courseCode, 50);
        const forceRefresh = Boolean(body.forceRefresh);

        if (!title && !courseCode && !courseId) {
            return NextResponse.json({ error: "Course ID, title, or course code is required." }, { status: 400 });
        }

        // ⚡ 2. Check Database / Server Cache first! If already processed, return immediately without generating!
        if (courseId && !forceRefresh) {
            const cached = await getCachedAiContent(courseId);
            if (cached.cheatsheet) {
                return NextResponse.json({
                    success: true,
                    markdown: cached.cheatsheet,
                    cached: true
                });
            }
        }

        // 🧠 3. If not in database yet (e.g. legacy file), generate via Gemini 2.5 Flash
        const markdown = await generateCheatSheetContent(title, courseCode);

        // 💾 4. Save to Database & Cache so all future requests always load from the database
        if (courseId) {
            try {
                await saveCachedAiContent(courseId, { cheatsheet: markdown });
            } catch (saveErr) {
                console.warn("[CheatSheet API] Database save warning:", saveErr);
            }
        }

        return NextResponse.json({
            success: true,
            markdown,
            cached: false
        });

    } catch (err: any) {
        console.error("Cheat Sheet API Error:", err);
        return NextResponse.json({ error: "Failed to generate cheat sheet. Please try again." }, { status: 500 });
    }
}
