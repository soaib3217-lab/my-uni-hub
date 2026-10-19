import { NextResponse } from "next/server";
import { pregenerateCourseAi } from "@/lib/aiService";
import { sanitizeString } from "@/lib/security";

export const maxDuration = 60; // Allow background generation time

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

        if (!courseId || !title) {
            return NextResponse.json({ success: false, error: "courseId and title required" }, { status: 400 });
        }

        // Trigger pre-generation asynchronously with automatic retry
        // Run in background without blocking caller
        pregenerateCourseAi(courseId, title, courseCode).catch(err => {
            console.error(`[AI Pregenerate API] Background job error for ${courseId}:`, err);
        });

        return NextResponse.json({
            success: true,
            message: "AI cheat sheet & quiz pre-generation started in background"
        });
    } catch (err: any) {
        console.error("[AI Pregenerate API] Server error:", err);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
