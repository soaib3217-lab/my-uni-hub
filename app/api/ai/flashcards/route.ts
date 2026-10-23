import { NextResponse } from "next/server";
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from "@/lib/security";
import { getCachedAiContent, saveCachedAiContent, generateFlashcardsContent } from "@/lib/aiService";

export async function POST(req: Request) {
    const clientIp = getClientIp(req);

    // 🔒 1. Session verification & Rate Limiting
    const user = await getAuthenticatedUser();
    const rateLimitKey = `flashcards_${user?.id || 'guest'}_${clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, 15, 60);

    if (!rateCheck.success) {
        return NextResponse.json(
            { error: `Rate limit reached. Please wait ${rateCheck.resetSeconds}s before requesting new flashcards.` },
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
        const modelPreference = sanitizeString(body.model || 'auto', 30);
        const forceRefresh = Boolean(body.forceRefresh);

        if (!title && !courseCode && !courseId) {
            return NextResponse.json({ error: "Course ID, title, or course code is required." }, { status: 400 });
        }

        // ⚡ 2. Check Database / Server Cache first
        if (courseId && !forceRefresh) {
            const cached = await getCachedAiContent(courseId);
            if (cached.flashcards && Array.isArray(cached.flashcards) && cached.flashcards.length > 0) {
                return NextResponse.json({
                    success: true,
                    flashcards: cached.flashcards,
                    cached: true
                });
            }
        }

        // 🧠 3. Generate via Gemini or OpenRouter fallback
        const flashcards = await generateFlashcardsContent(title, courseCode, modelPreference);

        // 💾 4. Save to Database & Cache
        if (courseId && flashcards.length > 0) {
            try {
                await saveCachedAiContent(courseId, { flashcards });
            } catch (saveErr) {
                console.warn("[Flashcards API] Database save warning:", saveErr);
            }
        }

        return NextResponse.json({
            success: true,
            flashcards,
            cached: false
        });

    } catch (err: any) {
        console.error("Flashcards API Error:", err);
        return NextResponse.json({ 
            error: err.message || "Failed to generate flashcards. Please try again." 
        }, { status: 500 });
    }
}
