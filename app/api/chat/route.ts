import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getClientIp, checkRateLimit, sanitizeString } from "@/lib/security";
import { callOpenRouter, CLAUDE_DEFAULT_MODEL, OPENROUTER_FREE_MODEL } from "@/lib/openRouterService";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

const BASE_SYSTEM_INSTRUCTION = `You are an expert university academic tutor for My Uni Hub (University Notes & Academic Hub).
Your mission is to help students thoroughly understand statistics, probability theory, linear algebra, calculus, data science, and university coursework.
- Always provide clear, encouraging, mathematically rigorous answers.
- Format all mathematical notation in KaTeX LaTeX ($inline$ or $$display block$$).
- Break complex statistical concepts into intuitive real-world explanations first, then present formal derivations.
- Always uphold academic integrity.`;

// ⚡ Fast In-Memory PDF Cache (keyed by Google Drive file ID or URL, 2 hours TTL)
interface CachedPdf {
    base64: string;
    mimeType: string;
    timestamp: number;
}
const pdfCache = new Map<string, CachedPdf>();
const PDF_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

function getDriveFileId(url: string): string | null {
    if (!url) return null;
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];
    const match3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match3 && match3[1]) return match3[1];
    return null;
}

async function fetchPdfBuffer(pdfUrl: string): Promise<{ base64: string; mimeType: string } | null> {
    const fileId = getDriveFileId(pdfUrl);
    const cacheKey = fileId || pdfUrl;

    const cached = pdfCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < PDF_CACHE_TTL)) {
        return { base64: cached.base64, mimeType: cached.mimeType };
    }

    const downloadUrl = fileId 
        ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
        : pdfUrl;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const res = await fetch(downloadUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });
        clearTimeout(timeout);

        if (!res.ok) {
            console.warn(`[Chat PDF Fetch] HTTP error ${res.status} fetching ${downloadUrl}`);
            return null;
        }

        const arrayBuffer = await res.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            return null;
        }

        // Skip if unexpectedly large (> 25MB)
        if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
            console.warn(`[Chat PDF Fetch] File too large for inline multimodal: ${arrayBuffer.byteLength} bytes`);
            return null;
        }

        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = "application/pdf";

        pdfCache.set(cacheKey, {
            base64,
            mimeType,
            timestamp: Date.now()
        });

        console.log(`[Chat PDF Fetch] Successfully fetched and cached PDF (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB) for key: ${cacheKey}`);
        return { base64, mimeType };
    } catch (err: any) {
        console.warn(`[Chat PDF Fetch] Failed to fetch PDF for ${pdfUrl}:`, err?.message || err);
        return null;
    }
}

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

        const { message, context, pdfUrl, courseCode, model: requestedModel } = body;

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

        // 📄 4. Fetch the PDF binary if a valid PDF URL was provided
        let pdfData: { base64: string; mimeType: string } | null = null;
        if (pdfUrl && typeof pdfUrl === 'string') {
            pdfData = await fetchPdfBuffer(pdfUrl);
        }

        // Build prompt tailored to whether the PDF is attached
        let prompt = cleanMessage;
        let systemInstruction = BASE_SYSTEM_INSTRUCTION;

        if (pdfData) {
            systemInstruction = `${BASE_SYSTEM_INSTRUCTION}
You have direct, multimodal visual and textual access to the attached course document: "${cleanContext || 'Course Notes'}" ${cleanCourseCode ? `[${cleanCourseCode}]` : ''}.
- Thoroughly analyze the attached PDF to answer the student's questions with exact precision.
- Cite specific chapters, sections, formulas, theorems, proofs, worked examples, and page numbers directly from the document.
- If asked to summarize, explain, or quiz, extract the exact definitions, notation, and methodologies from this PDF.`;

            prompt = `Document Title: "${cleanContext || 'Course PDF'}"
Student Question: ${cleanMessage}

Please review the attached course document and provide a comprehensive, academically sound answer formatted in KaTeX LaTeX ($...$ or $$...$$).`;
        } else if (cleanContext) {
            prompt = `Active Course / Document Context: "${cleanContext}" ${cleanCourseCode ? `(${cleanCourseCode})` : ''}
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

        // 💎 C. PRIMARY: GOOGLE GEMINI 2.5 FLASH (AUTO OR GEMINI MODE)
        if (apiKey && modelMode !== "llama") {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-2.5-flash",
                    systemInstruction: systemInstruction
                });

                const contentParts: any[] = [];
                if (pdfData) {
                    contentParts.push({
                        inlineData: {
                            mimeType: pdfData.mimeType,
                            data: pdfData.base64
                        }
                    });
                }
                contentParts.push(prompt);

                const result = await model.generateContent(contentParts);
                const response = await result.response;
                const text = response.text();

                if (text && text.trim().length > 0) {
                    return NextResponse.json({ 
                        text, 
                        modelUsed: "Gemini 2.5 Flash",
                        provider: "google",
                        pdfAnalyzed: !!pdfData
                    });
                }
            } catch (geminiErr: any) {
                console.warn("[Chat API] Gemini failed, auto-failing over to OpenRouter:", geminiErr?.message || geminiErr);
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