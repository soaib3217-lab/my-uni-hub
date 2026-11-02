import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseServer } from "@/lib/supabaseServer";
import { callOpenRouter, CLAUDE_DEFAULT_MODEL, OPENROUTER_FREE_MODEL } from "@/lib/openRouterService";
import { fetchPdfBuffer } from "@/lib/pdfService";
import fs from "fs";
import path from "path";

function getGenAI(): GoogleGenerativeAI | null {
    const key = process.env.GEMINI_API_KEY;
    return key ? new GoogleGenerativeAI(key) : null;
}

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];

async function callGeminiWithFallback(
    systemInstruction: string,
    prompt: string,
    pdfData: { base64: string; mimeType: string } | null,
    generationConfig?: any
): Promise<string | null> {
    const genAI = getGenAI();
    if (!genAI) return null;

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
                model: modelName,
                ...(generationConfig ? { generationConfig } : {})
            });
            const result = await model.generateContent(contentParts);
            const response = await result.response;
            const text = response.text();
            if (text && text.trim().length > 0) {
                return text.trim();
            }
        } catch (err: any) {
            console.warn(`[aiService] Gemini model ${modelName} error (${err?.status || err?.message?.slice(0, 80)}), trying next fallback...`);
        }
    }
    return null;
}

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface FlashcardItem {
    id: number;
    question: string;
    answer: string;
    keyFormula?: string;
    category?: string;
}

export interface CachedAiBundle {
    cheatsheet?: string;
    quiz?: QuizQuestion[];
    flashcards?: FlashcardItem[];
}

// 📁 Local Persistent Fallback Cache (ensures instant load even before DB migration is run)
const CACHE_FILE = path.join(process.cwd(), "scratch", "ai_cache.json");

function readLocalCache(): Record<string, CachedAiBundle> {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, "utf-8");
            return JSON.parse(raw);
        }
    } catch {
        // ignore cache read errors
    }
    return {};
}

function writeLocalCache(courseId: string, data: CachedAiBundle) {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const cache = readLocalCache();
        cache[courseId] = {
            ...(cache[courseId] || {}),
            ...data
        };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } catch (e) {
        console.warn("Local AI cache write warning:", e);
    }
}

/**
 * Retrieve cached CheatSheet, Quiz & Flashcards for a course from Supabase DB (or local fallback).
 */
export async function getCachedAiContent(courseId: string | number): Promise<CachedAiBundle> {
    if (!courseId) return {};
    const cId = String(courseId);

    // 1. Try Supabase Database first
    try {
        const { data, error } = await supabaseServer
            .from("courses")
            .select("ai_cheatsheet, ai_quiz, ai_flashcards")
            .eq("id", courseId)
            .single();

        if (!error && data) {
            const result: CachedAiBundle = {};
            if (data.ai_cheatsheet) result.cheatsheet = data.ai_cheatsheet;
            if (data.ai_quiz && Array.isArray(data.ai_quiz)) result.quiz = data.ai_quiz;
            if (data.ai_flashcards && Array.isArray(data.ai_flashcards)) result.flashcards = data.ai_flashcards;
            if (result.cheatsheet || result.quiz || result.flashcards) return result;
        }
    } catch {
        // DB columns might not exist yet; fall back gracefully
    }

    // 2. Check local fallback cache
    const local = readLocalCache();
    return local[cId] || {};
}

/**
 * Persist AI generated content to Supabase DB (and local fallback cache).
 */
export async function saveCachedAiContent(
    courseId: string | number,
    content: CachedAiBundle
): Promise<void> {
    if (!courseId) return;
    const cId = String(courseId);

    // 1. Save to local fallback cache immediately
    writeLocalCache(cId, content);

    // 2. Persist to Supabase Database
    try {
        const updatePayload: any = {};
        if (content.cheatsheet) updatePayload.ai_cheatsheet = content.cheatsheet;
        if (content.quiz) updatePayload.ai_quiz = content.quiz;
        if (content.flashcards) updatePayload.ai_flashcards = content.flashcards;

        const { error } = await supabaseServer
            .from("courses")
            .update(updatePayload)
            .eq("id", courseId);

        if (error) {
            // If ai_flashcards column is missing, retry updating without it
            if (error.message?.includes("ai_flashcards")) {
                const retryPayload = { ...updatePayload };
                delete retryPayload.ai_flashcards;
                await supabaseServer.from("courses").update(retryPayload).eq("id", courseId);
            } else {
                console.warn("Supabase AI column update warning (run supabase-migration.sql if columns missing):", error.message);
            }
        } else {
            console.log(`[aiService] Saved AI content for course ${courseId} to database.`);
        }
    } catch (err) {
        console.warn("Supabase AI save warning:", err);
    }
}

/**
 * Generate 1-Page Exam Cheat Sheet using Gemini, with OpenRouter automatic fallback.
 * Directly reads attached course PDF to extract authentic formulas, definitions, and theorems.
 */
export async function generateCheatSheetContent(
    title: string,
    courseCode: string,
    pdfUrl?: string,
    modelPreference = "auto"
): Promise<string> {
    let pdfData: { base64: string; mimeType: string; byteLength: number } | null = null;
    if (pdfUrl) {
        pdfData = await fetchPdfBuffer(pdfUrl);
    }

    let systemInstruction = `You are an elite university professor and academic tutor specializing in Statistics, Mathematics, Data Science, and Computer Science.
Your job is to generate an extraordinarily clear, high-yield, and visually pristine "1-Page Exam Cheat Sheet" for university students.
Format your output strictly in clean GitHub-Flavored Markdown with KaTeX math:
- Inline math with $...$ (e.g. $X$, $\\beta_1$, $R^2$)
- Display block equations on their own lines using $$...$$
- NEVER crowd multiple distinct formulas or steps onto one line. Each derivation step or key formula MUST have its own line or display block.
- For tables, format each row on a new line with clear | delimiters and header separators (|:---|:---|). Always place an empty line before and after tables.
- Clearly separate problem statements, formulas, intermediate arithmetic, and final interpretations with dedicated lines.

Include these 5 structured sections:
1. 🎯 **Core Concept & Intuition** (A crystal-clear, high-intuition 2-3 sentence explanation of the central topic)
2. 📐 **Essential Formulas & Equations** (All key mathematical formulas, clearly written with variable definitions)
3. 🔬 **Key Theorems & Properties** (Essential rules, assumptions, degrees of freedom, hypothesis test conditions)
4. ⚠️ **Common Exam Traps & Pitfalls** (Mistakes professors love to test, boundary conditions, edge cases, misinterpretations)
5. 💡 **Quick Worked Example** (A concise, step-by-step application with clean, readable numbers, properly formatted tables, and clear step headers)`;

    let prompt = `Generate a high-yield university exam cheat sheet for:
Course: ${courseCode || "University Statistics & Math"}
Topic / Lecture: "${title}"

Ensure all mathematical expressions use standard KaTeX ($...$ or $$...$$). Make it rigorous, professional, spacious, and directly useful for exam preparation.`;

    if (pdfData) {
        systemInstruction = `${systemInstruction}
CRITICAL REQUIREMENT: You have direct visual and textual access to the attached course document: "${title}" (${courseCode || "Course"}).
Your cheat sheet MUST be derived STRICTLY and FAITHFULLY from the contents of this attached PDF document.
- Extract the exact definitions, theorems, formulas, notation, properties, and worked examples from THIS document.
- Cite specific sections or formulas from this note.
- Do not invent generic topics not covered in this document.`;

        prompt = `Attached Course Document: "${title}" (${courseCode || "Course"})
Please thoroughly read the attached PDF note and generate a comprehensive 1-page exam cheat sheet reflecting the exact notation, formulas, theorems, and examples taught in this document.`;
    }

    // 1. If explicit Claude requested, go directly via OpenRouter
    if (modelPreference === "claude") {
        const orResult = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], CLAUDE_DEFAULT_MODEL);
        if (orResult.success && orResult.content) return orResult.content;
    }

    // 2. Try Gemini Flash cascade with direct PDF analysis
    if (modelPreference !== "claude") {
        const text = await callGeminiWithFallback(systemInstruction, prompt, pdfData);
        if (text && text.trim().length > 50) {
            return text;
        }
    }

    // 3. Fallback: OpenRouter Free Models
    const orFallback = await callOpenRouter([
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
    ], OPENROUTER_FREE_MODEL);

    if (orFallback.success && orFallback.content) {
        return orFallback.content;
    }

    throw new Error(orFallback.error || "Failed to generate cheat sheet across all AI engines.");
}

function parseJsonClean<T>(raw: string): T {
    let clean = raw.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Escape backslashes before letters if not already escaped (for LaTeX like \beta, \sum)
    const fixed = clean.replace(/\\([a-zA-Z])/g, '\\\\$1');

    try {
        return JSON.parse(fixed);
    } catch {
        try {
            return JSON.parse(clean);
        } catch (err: any) {
            console.error("[aiService] JSON parsing failed:", clean.slice(0, 300));
            throw new Error(`Failed to parse AI JSON response: ${err.message}`);
        }
    }
}

/**
 * Generate 5-Question AI Practice Quiz with OpenRouter Fallback.
 * Directly reads attached course PDF to test actual concepts and problems taught in the document.
 */
export async function generateQuizContent(
    title: string,
    courseCode: string,
    pdfUrl?: string,
    modelPreference = "auto"
): Promise<QuizQuestion[]> {
    let pdfData: { base64: string; mimeType: string; byteLength: number } | null = null;
    if (pdfUrl) {
        pdfData = await fetchPdfBuffer(pdfUrl);
    }

    let systemInstruction = `You are an expert university exam writer and professor in Statistics, Mathematics, and Computer Science.
Generate a challenging and educational 5-question multiple choice practice quiz based on the requested subject.
Each question must test conceptual understanding, formula application, or theoretical properties.
Return a JSON array of 5 objects strictly adhering to this schema:
[
  {
    "id": 1,
    "question": "Question text with inline KaTeX $...$ if mathematical",
    "options": [
      "Option A text",
      "Option B text",
      "Option C text",
      "Option D text"
    ],
    "correctIndex": 0,
    "explanation": "Brief crystal-clear pedagogical explanation with math formatting if needed"
  }
]
Format all math in KaTeX syntax ($...$). The correctIndex must be an integer from 0 to 3.
IMPORTANT: All LaTeX backslashes inside JSON strings must be escaped with double backslashes (e.g. \\\\beta, \\\\sum, \\\\frac). Return ONLY valid JSON.`;

    let prompt = `Create a 5-question multiple choice university practice quiz for:
Course: ${courseCode || "University Statistics"}
Topic / Lecture: "${title}"`;

    if (pdfData) {
        systemInstruction = `${systemInstruction}
CRITICAL REQUIREMENT: You have direct access to the attached course document: "${title}" (${courseCode || "Course"}).
Every single question and explanation MUST test the student strictly on the theorems, definitions, derivations, formulas, or worked examples presented in this attached PDF document.`;

        prompt = `Attached Document: "${title}" (${courseCode || "Course"})
Please thoroughly read the attached PDF note and generate a 5-question multiple choice practice quiz testing knowledge directly covered in this document.`;
    }

    let rawJson = "";

    // 1. Claude via OpenRouter if requested
    if (modelPreference === "claude") {
        const orRes = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], CLAUDE_DEFAULT_MODEL);
        if (orRes.success && orRes.content) {
            rawJson = orRes.content;
        }
    }

    // 2. Try Gemini Flash cascade with JSON response mime-type & PDF analysis
    if (!rawJson && modelPreference !== "claude") {
        const text = await callGeminiWithFallback(systemInstruction, prompt, pdfData, { responseMimeType: "application/json" });
        if (text) {
            rawJson = text;
        }
    }

    // 3. OpenRouter fallback if Gemini failed
    if (!rawJson) {
        const orRes = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], OPENROUTER_FREE_MODEL);
        if (orRes.success && orRes.content) {
            rawJson = orRes.content;
        }
    }

    if (!rawJson) {
        throw new Error("Failed to generate quiz content from AI providers.");
    }

    const parsed: any = parseJsonClean(rawJson);
    const questionsArray = Array.isArray(parsed) 
        ? parsed 
        : (parsed.questions || parsed.data || Object.values(parsed).find(v => Array.isArray(v)) || []);

    return questionsArray.map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        question: q.question || "Question",
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || ""
    }));
}

/**
 * Generate 6-8 Interactive AI Flashcards with OpenRouter Fallback.
 * Directly reads attached course PDF to generate flashcards covering real definitions and formulas.
 */
export async function generateFlashcardsContent(
    title: string,
    courseCode: string,
    pdfUrl?: string,
    modelPreference = "auto"
): Promise<FlashcardItem[]> {
    let pdfData: { base64: string; mimeType: string; byteLength: number } | null = null;
    if (pdfUrl) {
        pdfData = await fetchPdfBuffer(pdfUrl);
    }

    let systemInstruction = `You are a world-class academic study coach.
Create 6 to 8 high-yield interactive study flashcards for a university student.
Focus on core definitions, formula recall, theorem conditions, and problem-solving heuristics.
Return a valid JSON array of objects with this schema:
[
  {
    "id": 1,
    "question": "Front of card (concise concept question or prompt with KaTeX math $...$)",
    "answer": "Back of card (clear, precise answer or explanation with KaTeX math $...$)",
    "keyFormula": "Optional key formula wrapped in KaTeX ($...$ or $$...$$) or null",
    "category": "Definition | Formula | Theorem | Application"
  }
]
Format all math strictly in KaTeX ($inline$ or $$display$$). Return ONLY the raw JSON array.`;

    let prompt = `Generate interactive flashcards for:
Course: ${courseCode || "University Academic Course"}
Topic / Lecture: "${title}"`;

    if (pdfData) {
        systemInstruction = `${systemInstruction}
CRITICAL REQUIREMENT: You have direct access to the attached course document: "${title}" (${courseCode || "Course"}).
The flashcards MUST be derived STRICTLY and FAITHFULLY from the attached PDF document.
Extract the exact definitions, formula statements, theorems, and rules presented in this document.`;

        prompt = `Attached Document: "${title}" (${courseCode || "Course"})
Please thoroughly read the attached PDF note and generate 6 to 8 high-yield interactive study flashcards directly testing material from this document.`;
    }

    let rawJson = "";

    // 1. Try Claude if requested
    if (modelPreference === "claude") {
        const orRes = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], CLAUDE_DEFAULT_MODEL);
        if (orRes.success && orRes.content) rawJson = orRes.content;
    }

    // 2. Try Gemini Flash cascade with JSON response mime-type & PDF analysis
    if (!rawJson && modelPreference !== "claude") {
        const text = await callGeminiWithFallback(systemInstruction, prompt, pdfData, { responseMimeType: "application/json" });
        if (text) {
            rawJson = text;
        }
    }

    // 3. Fallback OpenRouter
    if (!rawJson) {
        const orRes = await callOpenRouter([
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ], OPENROUTER_FREE_MODEL);
        if (orRes.success && orRes.content) rawJson = orRes.content;
    }

    if (!rawJson) {
        throw new Error("Failed to generate flashcards from AI providers.");
    }

    const parsed: any = parseJsonClean(rawJson);
    const cardsArray = Array.isArray(parsed) 
        ? parsed 
        : (parsed.flashcards || parsed.cards || Object.values(parsed).find(v => Array.isArray(v)) || []);

    return cardsArray.map((c: any, idx: number) => {
        let keyFormula = c.keyFormula || undefined;
        if (keyFormula && typeof keyFormula === 'string') {
            const trimmed = keyFormula.trim();
            if (trimmed && !trimmed.includes('$')) {
                keyFormula = `$$${trimmed}$$`;
            }
        }
        return {
            id: c.id || idx + 1,
            question: c.question || "Flashcard Question",
            answer: c.answer || "Answer",
            keyFormula,
            category: c.category || "Study Concept"
        };
    });
}

/**
 * Asynchronous Background Pre-generation with Automatic Fallback.
 * Runs to pre-generate Cheat Sheet, Quiz, and Flashcards and saves to DB.
 */
export async function pregenerateCourseAi(
    courseId: string,
    title: string,
    courseCode: string,
    pdfUrl?: string
): Promise<CachedAiBundle> {
    if (!courseId || !title) return {};

    console.log(`[AI Engine] 🚀 Executing pre-generation for Course ID: ${courseId} ("${title}")...`);

    const existing = await getCachedAiContent(courseId);
    const needCheatSheet = !existing.cheatsheet;
    const needQuiz = !existing.quiz || !Array.isArray(existing.quiz) || existing.quiz.length === 0;
    const needFlashcards = !existing.flashcards || !Array.isArray(existing.flashcards) || existing.flashcards.length === 0;

    if (!needCheatSheet && !needQuiz && !needFlashcards) {
        console.log(`[AI Engine] Course ${courseId} already has all AI assets cached. Skipping.`);
        return existing;
    }

    const toSave: CachedAiBundle = { ...existing };

    // Run generations concurrently
    const [cheatResult, quizResult, flashResult] = await Promise.allSettled([
        needCheatSheet ? generateCheatSheetContent(title, courseCode, pdfUrl) : Promise.resolve(existing.cheatsheet!),
        needQuiz ? generateQuizContent(title, courseCode, pdfUrl) : Promise.resolve(existing.quiz!),
        needFlashcards ? generateFlashcardsContent(title, courseCode, pdfUrl) : Promise.resolve(existing.flashcards!)
    ]);

    if (cheatResult.status === "fulfilled" && cheatResult.value) {
        toSave.cheatsheet = cheatResult.value;
        console.log(`[AI Engine] ✓ Cheat Sheet ready for "${title}"`);
    } else if (cheatResult.status === "rejected") {
        console.error(`[AI Engine] ❌ Cheat Sheet generation failed:`, cheatResult.reason);
    }

    if (quizResult.status === "fulfilled" && quizResult.value) {
        toSave.quiz = quizResult.value;
        console.log(`[AI Engine] ✓ Practice Quiz ready for "${title}"`);
    } else if (quizResult.status === "rejected") {
        console.error(`[AI Engine] ❌ Quiz generation failed:`, quizResult.reason);
    }

    if (flashResult.status === "fulfilled" && flashResult.value) {
        toSave.flashcards = flashResult.value;
        console.log(`[AI Engine] ✓ Flashcards ready for "${title}"`);
    } else if (flashResult.status === "rejected") {
        console.error(`[AI Engine] ❌ Flashcards generation failed:`, flashResult.reason);
    }

    // Persist to Supabase Database & Cache
    if (toSave.cheatsheet || toSave.quiz || toSave.flashcards) {
        await saveCachedAiContent(courseId, toSave);
        console.log(`[AI Engine] 💾 Persisted pre-generated AI content for "${title}"`);
    }

    return toSave;
}
