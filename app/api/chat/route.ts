import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from "@/lib/security";
import { callOpenRouter, CLAUDE_DEFAULT_MODEL, OPENROUTER_FREE_MODEL } from "@/lib/openRouterService";
import { fetchPdfBuffer } from "@/lib/pdfService";

function getGenAI(): GoogleGenerativeAI | null {
    const key = process.env.GEMINI_API_KEY;
    return key ? new GoogleGenerativeAI(key) : null;
}

const BASE_SYSTEM_INSTRUCTION = `You are an expert university academic tutor for My Uni Hub (University Notes & Academic Hub).
Your mission is to help students thoroughly understand statistics, probability theory, linear algebra, calculus, data science, and university coursework.
- Always provide clear, encouraging, mathematically rigorous answers.
- Format all mathematical notation in KaTeX LaTeX ($inline$ or $$display block$$).
- Break complex statistical concepts into intuitive real-world explanations first, then present formal derivations.
- Always uphold academic integrity.`;

export async function POST(req: Request) {
    const clientIp = getClientIp(req);

    // 🔒 1. Authenticate user session (allow logged in students and limited guest demo)
    const user = await getAuthenticatedUser();
    
    // 🛡️ 2. Rate limiting: 30 requests/min for logged-in, 8 requests/min for guests
    const maxRequests = user ? 30 : 8;
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

        const { message, context, pdfUrl, courseCode, model: requestedModel, history } = body;

        // 🛡️ 3. Input Validation
        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: "Message is required." }, { status: 400 });
        }

        const cleanMessage = sanitizeString(message, 2500);
        if (cleanMessage.length === 0) {
            return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
        }

        const cleanContext = context ? sanitizeString(context, 400) : null;
        const cleanCourseCode = courseCode ? sanitizeString(courseCode, 50) : null;
        const modelMode = (requestedModel || "auto").toLowerCase();

        // 📄 4. Fetch and validate the PDF binary if a PDF URL was provided
        let pdfData: { base64: string; mimeType: string; byteLength: number } | null = null;
        if (pdfUrl && typeof pdfUrl === 'string') {
            pdfData = await fetchPdfBuffer(pdfUrl);
        }

        // Build dialogue context from recent turns
        let conversationContext = "";
        if (Array.isArray(history) && history.length > 0) {
            const recent = history.slice(-4).map((h: any) => {
                const role = h.role === 'user' ? 'Student' : 'Tutor';
                const text = typeof h.text === 'string' ? h.text.slice(0, 300) : '';
                return `${role}: ${text}`;
            }).filter(Boolean);
            if (recent.length > 0) {
                conversationContext = `\n\nRecent Conversation Context:\n${recent.join("\n")}\n`;
            }
        }

        // Build prompt tailored to whether the PDF is attached
        let prompt = `${conversationContext}Student Question: ${cleanMessage}`;
        let systemInstruction = BASE_SYSTEM_INSTRUCTION;

        if (pdfData) {
            systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
You have direct, multimodal visual and textual access to the attached course document: "${cleanContext || 'Course Notes'}" ${cleanCourseCode ? `[${cleanCourseCode}]` : ''}.
- Thoroughly analyze the attached PDF to answer the student's questions with exact precision.
- Cite specific chapters, sections, formulas, theorems, proofs, worked examples, and page numbers directly from the document.
- If asked to summarize, explain, or quiz, extract the exact definitions, notation, and methodologies from this PDF.
- If a question asks about something completely absent from this document, clearly state that it is not covered in this document.`;

            prompt = `Active Course Document: "${cleanContext || 'Course PDF'}" ${cleanCourseCode ? `[${cleanCourseCode}]` : ''}
${conversationContext}
Student Question: ${cleanMessage}

Please review the attached course document and provide an accurate, academically sound answer formatted in KaTeX LaTeX ($...$ or $$...$$).`;
        } else if (cleanContext) {
            prompt = `Active Course / Document Context: "${cleanContext}" ${cleanCourseCode ? `(${cleanCourseCode})` : ''}
${conversationContext}
Student Question: ${cleanMessage}

Please provide a clear, helpful academic answer formatted in KaTeX LaTeX ($...$).`;
        }

        // 🧠 A. USER REQUESTED CLAUDE VIA OPENROUTER
        if (modelMode === "claude") {
            let messages: any[] = [{ role: "system", content: systemInstruction }];

            if (pdfData) {
                // OpenRouter Claude format with document block
                messages.push({
                    role: "user",
                    content: [
                        {
                            type: "file",
                            file: {
                                filename: `${cleanContext || "course_notes"}.pdf`,
                                file_data: `data:application/pdf;base64,${pdfData.base64}`
                            }
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                });
            } else {
                messages.push({ role: "user", content: prompt });
            }

            const orRes = await callOpenRouter(messages, CLAUDE_DEFAULT_MODEL);

            if (orRes.success && orRes.content) {
                return NextResponse.json({ 
                    text: orRes.content, 
                    modelUsed: "Claude 4.5 (OpenRouter)",
                    provider: "openrouter",
                    pdfAnalyzed: !!pdfData
                });
            }
            // If Claude failed, fall through to Gemini or standby
        }

        // 🦙 B. USER REQUESTED OPENROUTER FREE
        if (modelMode === "llama") {
            const orRes = await callOpenRouter([
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ], OPENROUTER_FREE_MODEL);

            if (orRes.success && orRes.content) {
                return NextResponse.json({ 
                    text: orRes.content, 
                    modelUsed: "Nemotron 3.5 (OpenRouter Free)",
                    provider: "openrouter",
                    pdfAnalyzed: false
                });
            }
        }

        // 💎 C. PRIMARY: GOOGLE GEMINI FLASH CASCADE (AUTO OR GEMINI MODE)
        const genAI = getGenAI();
        const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];

        if (genAI && modelMode !== "llama") {
            const contentParts: any[] = [];
            if (pdfData) {
                contentParts.push({
                    inlineData: {
                        mimeType: pdfData.mimeType,
                        data: pdfData.base64
                    }
                });
            }
            const combinedPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
            contentParts.push(combinedPrompt);

            for (const modelName of GEMINI_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({ 
                        model: modelName
                    });

                    const result = await model.generateContent(contentParts);
                    const response = await result.response;
                    const text = response.text();

                    if (text && text.trim().length > 0) {
                        return NextResponse.json({ 
                            text, 
                            modelUsed: `${modelName === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : modelName}`,
                            provider: "google",
                            pdfAnalyzed: !!pdfData
                        });
                    }
                } catch (geminiErr: any) {
                    console.warn(`[Chat API] Gemini model ${modelName} error (${geminiErr?.status || geminiErr?.message?.slice(0, 80)}), trying next fallback...`);
                }
            }
        }

        // 🛡️ D. AUTOMATIC FALLBACK: OPENROUTER
        console.log("[Chat API] Activating OpenRouter standby fallback...");
        const fallbackRes = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], OPENROUTER_FREE_MODEL);

        if (fallbackRes.success && fallbackRes.content) {
            return NextResponse.json({ 
                text: fallbackRes.content, 
                modelUsed: `${fallbackRes.model} (OpenRouter Fallback)`,
                provider: "openrouter_fallback",
                pdfAnalyzed: false
            });
        }

        return NextResponse.json({ 
            error: "All AI providers are currently busy. Please try again in a few moments." 
        }, { status: 503 });

    } catch (error: any) {
        console.error("AI Route Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to generate AI response. Please try again." }, { status: 500 });
    }
}