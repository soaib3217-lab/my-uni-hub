import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseServer } from "@/lib/supabaseServer";
import fs from "fs";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

// 📁 Local Persistent Fallback Cache (ensures instant load even before DB migration is run)
const CACHE_FILE = path.join(process.cwd(), "scratch", "ai_cache.json");

function readLocalCache(): Record<string, { cheatsheet?: string; quiz?: QuizQuestion[] }> {
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

function writeLocalCache(courseId: string, data: { cheatsheet?: string; quiz?: QuizQuestion[] }) {
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
 * Retrieve cached CheatSheet & Quiz for a course from Supabase DB (or local fallback).
 */
export async function getCachedAiContent(courseId: string | number): Promise<{ cheatsheet?: string; quiz?: QuizQuestion[] }> {
    if (!courseId) return {};
    const cId = String(courseId);

    // 1. Try Supabase Database first
    try {
        const { data, error } = await supabaseServer
            .from("courses")
            .select("ai_cheatsheet, ai_quiz")
            .eq("id", courseId)
            .single();

        if (!error && data) {
            const result: { cheatsheet?: string; quiz?: QuizQuestion[] } = {};
            if (data.ai_cheatsheet) result.cheatsheet = data.ai_cheatsheet;
            if (data.ai_quiz && Array.isArray(data.ai_quiz)) result.quiz = data.ai_quiz;
            if (result.cheatsheet || result.quiz) return result;
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
    content: { cheatsheet?: string; quiz?: QuizQuestion[] }
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

        const { error } = await supabaseServer
            .from("courses")
            .update(updatePayload)
            .eq("id", courseId);

        if (error) {
            console.warn("Supabase AI column update warning (run supabase-migration.sql if columns missing):", error.message);
        } else {
            console.log(`[aiService] Saved AI content for course ${courseId} to database.`);
        }
    } catch (err) {
        console.warn("Supabase AI save warning:", err);
    }
}

/**
 * Generate 1-Page Exam Cheat Sheet using Gemini 2.5 Flash
 */
export async function generateCheatSheetContent(title: string, courseCode: string): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `You are an elite university professor and academic tutor specializing in Statistics, Mathematics, Data Science, and Computer Science.
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
5. 💡 **Quick Worked Example** (A concise, step-by-step application with clean, readable numbers, properly formatted tables, and clear step headers)`
    });

    const prompt = `Generate a high-yield university exam cheat sheet for:
Course: ${courseCode || "University Statistics & Math"}
Topic / Lecture: "${title}"

Ensure all mathematical expressions use standard KaTeX ($...$ or $$...$$). Make it rigorous, professional, spacious, and directly useful for exam preparation.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

function parseQuizJson(raw: string): QuizQuestion[] {
    let clean = raw.trim();
    // Strip markdown code fences if present
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // In JSON, unescaped LaTeX macros like \beta, \frac, \hat, \sum, \bar, \alpha, \sigma cause JSON parse errors.
    // Replace any backslash preceding a letter with a double backslash
    const fixed = clean.replace(/\\([a-zA-Z])/g, '\\\\$1');

    let parsed: any;
    try {
        parsed = JSON.parse(fixed);
    } catch {
        // Fallback: try raw clean in case it was already double-escaped
        try {
            parsed = JSON.parse(clean);
        } catch (err: any) {
            console.error("[aiService] Failed to parse quiz JSON:", clean.slice(0, 300));
            throw new Error(`Failed to parse quiz response: ${err.message}`);
        }
    }

    // Normalize: if wrapped in an object like { questions: [...] }
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
 * Generate 5-Question AI Practice Quiz using Gemini 2.5 Flash
 */
export async function generateQuizContent(title: string, courseCode: string): Promise<QuizQuestion[]> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        },
        systemInstruction: `You are an expert university exam writer and professor in Statistics, Mathematics, and Computer Science.
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
IMPORTANT: All LaTeX backslashes inside JSON strings must be escaped with double backslashes (e.g. \\\\beta, \\\\sum, \\\\frac, \\\\hat, \\\\bar).`
    });

    const prompt = `Create a 5-question multiple choice university practice quiz for:
Course: ${courseCode || "University Statistics"}
Topic / Lecture: "${title}"

Questions should range from fundamental definitions to calculation problems and theoretical edge cases.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();
    return parseQuizJson(jsonText);
}

/**
 * Helper to run an async operation with automatic retry & exponential backoff
 */
async function withRetry<T>(
    operationName: string, 
    fn: () => Promise<T>, 
    maxRetries = 3, 
    initialDelayMs = 2000
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            console.warn(`[AI Background] ${operationName} attempt ${attempt}/${maxRetries} failed:`, err?.message || err);
            if (attempt < maxRetries) {
                const waitTime = initialDelayMs * Math.pow(2, attempt - 1);
                console.log(`[AI Background] Retrying ${operationName} in ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
            }
        }
    }
    throw lastError;
}

/**
 * Asynchronous Background Pre-generation with Automatic Retries.
 * Runs silently in the background when a file is uploaded to pre-generate both Cheat Sheet and Quiz
 * and save them to the database. If any command fails, it automatically retries with backoff.
 */
export async function pregenerateCourseAi(courseId: string, title: string, courseCode: string): Promise<void> {
    if (!courseId || !title) return;

    try {
        console.log(`[AI Background] 🚀 Starting automated pre-generation for Course ID: ${courseId} ("${title}")...`);

        // Check if already in cache before regenerating
        const existing = await getCachedAiContent(courseId);
        const needCheatSheet = !existing.cheatsheet;
        const needQuiz = !existing.quiz || !Array.isArray(existing.quiz) || existing.quiz.length === 0;

        if (!needCheatSheet && !needQuiz) {
            console.log(`[AI Background] Course ${courseId} already has cheat sheet and quiz cached in database. Skipping.`);
            return;
        }

        // Run both in parallel with automatic retries on failure
        const [cheatSheetResult, quizResult] = await Promise.allSettled([
            needCheatSheet 
                ? withRetry("CheatSheetGeneration", () => generateCheatSheetContent(title, courseCode), 3, 2000)
                : Promise.resolve(existing.cheatsheet as string),
            needQuiz 
                ? withRetry("QuizGeneration", () => generateQuizContent(title, courseCode), 3, 2000)
                : Promise.resolve(existing.quiz as QuizQuestion[])
        ]);

        const toSave: { cheatsheet?: string; quiz?: QuizQuestion[] } = {};

        if (cheatSheetResult.status === "fulfilled" && cheatSheetResult.value) {
            toSave.cheatsheet = cheatSheetResult.value;
            console.log(`[AI Background] ✓ Cheat Sheet successfully generated for: "${title}"`);
        } else if (cheatSheetResult.status === "rejected") {
            console.error(`[AI Background] ❌ Cheat Sheet generation failed after retries for: "${title}":`, cheatSheetResult.reason);
        }

        if (quizResult.status === "fulfilled" && quizResult.value) {
            toSave.quiz = quizResult.value;
            console.log(`[AI Background] ✓ Practice Quiz successfully generated for: "${title}"`);
        } else if (quizResult.status === "rejected") {
            console.error(`[AI Background] ❌ Quiz generation failed after retries for: "${title}":`, quizResult.reason);
        }

        if (toSave.cheatsheet || toSave.quiz) {
            await saveCachedAiContent(courseId, toSave);
            console.log(`[AI Background] 💾 AI content successfully persisted to database for: "${title}" (Course ID: ${courseId})`);
        }
    } catch (err) {
        console.error(`[AI Background] Fatal pre-generation error for ${courseId}:`, err);
    }
}

