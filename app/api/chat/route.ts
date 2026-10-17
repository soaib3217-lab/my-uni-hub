import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from "@/lib/security";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
    console.error("FATAL: GEMINI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
    const clientIp = getClientIp(req);

    // 🔒 1. Authenticate user session (allow logged in students and limited guest demo)
    const user = await getAuthenticatedUser();
    
    // 🛡️ 2. Rate limiting: 25 requests/min for logged-in, 6 requests/min for guests
    const maxRequests = user ? 25 : 6;
    const rateLimitKey = `chat_${user?.id || 'guest'}_${clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, maxRequests, 60);
    
    if (!rateCheck.success) {
        return NextResponse.json(
            { error: `Too many AI requests. Please wait ${rateCheck.resetSeconds} seconds or log in for higher limits.` },
            { 
                status: 429,
                headers: { 'Retry-After': String(rateCheck.resetSeconds) }
            }
        );
    }

    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { message, context, stream } = body;

        // 🛡️ 3. Input Validation & Prompt Injection Defense
        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        const cleanMessage = sanitizeString(message, 1500);
        if (cleanMessage.length === 0) {
            return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
        }

        const cleanContext = context ? sanitizeString(context, 300) : null;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: `You are an expert university academic tutor for STAT.Notes (University Notes & Study Hub).
Your mission is to help students thoroughly understand statistics, probability theory, linear algebra, calculus, data science, and academic coursework.
- Always provide clear, encouraging, mathematically rigorous answers.
- Format all mathematical notation in KaTeX LaTeX ($inline$ or $$display block$$).
- Break complex statistical concepts into intuitive real-world explanations first, then present the formal mathematical derivation.
- Always uphold academic integrity.`
        });

        let prompt = cleanMessage;
        if (cleanContext) {
            prompt = `Active Document / Subject Context: "${cleanContext}"\n\nStudent Question: ${cleanMessage}\n\nPlease provide a clear, helpful academic answer related to this subject with formulas formatted in KaTeX ($...$).`;
        }

        // If client requested streaming:
        if (stream) {
            const streamResult = await model.generateContentStream(prompt);
            const encoder = new TextEncoder();
            
            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of streamResult.stream) {
                            const chunkText = chunk.text();
                            controller.enqueue(encoder.encode(chunkText));
                        }
                        controller.close();
                    } catch (err) {
                        controller.error(err);
                    }
                }
            });

            return new Response(readable, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked'
                }
            });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("AI Route Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to generate AI response. Please try again." }, { status: 500 });
    }
}