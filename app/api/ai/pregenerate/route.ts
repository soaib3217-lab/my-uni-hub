import { NextResponse } from "next/server";
import { pregenerateCourseAi } from "@/lib/aiService";
import { sanitizeString } from "@/lib/security";
import { supabaseServer } from "@/lib/supabaseServer";

export const maxDuration = 60; // Allow sufficient execution window in serverless
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
        }

        const courseId = body.courseId != null ? String(body.courseId).trim() : '';
        const title = sanitizeString(body.title, 200);
        const courseCode = sanitizeString(body.courseCode, 50);
        const pdfUrl = body.pdfUrl ? sanitizeString(body.pdfUrl, 500) : undefined;

        if (!courseId || !title) {
            return NextResponse.json({ success: false, error: "courseId and title required" }, { status: 400 });
        }

        let resolvedPdfUrl = pdfUrl;
        if (!resolvedPdfUrl && courseId) {
            try {
                const { data: cData } = await supabaseServer
                    .from("courses")
                    .select("pdf_url")
                    .eq("id", courseId)
                    .single();
                if (cData?.pdf_url) resolvedPdfUrl = cData.pdf_url;
            } catch (err) {
                console.warn("[pregenerate] Failed to lookup pdf_url for course", courseId, err);
            }
        }

        // Await the pre-generation so serverless contexts do not terminate prematurely!
        const generated = await pregenerateCourseAi(courseId, title, courseCode, resolvedPdfUrl);

        return NextResponse.json({
            success: true,
            message: "AI cheat sheet, quiz & flashcards ready",
            hasCheatsheet: Boolean(generated.cheatsheet),
            hasQuiz: Boolean(generated.quiz?.length),
            hasFlashcards: Boolean(generated.flashcards?.length)
        });
    } catch (err: any) {
        console.error("[AI Pregenerate API] Execution error:", err);
        return NextResponse.json({ 
            success: false, 
            error: err.message || "Failed to generate AI assets" 
        }, { status: 500 });
    }
}
