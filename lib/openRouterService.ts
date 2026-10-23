/**
 * OpenRouter AI Service
 * Supports multi-provider completions including Claude 3.5, Llama 3.3 Free, and Gemini Free.
 * Acts as primary provider for Claude and automatic standby/fallback when direct Gemini limits are exceeded.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "My Uni Hub";

export const CLAUDE_DEFAULT_MODEL = process.env.CLAUDE_MODEL_NAME || "anthropic/claude-haiku-4.5";
export const OPENROUTER_FREE_MODEL = "nvidia/nemotron-3.5-super-vl:free";
export const OPENROUTER_FALLBACK_MODELS = [
    "nvidia/nemotron-3.5-super-vl:free",
    "nvidia/nemotron-3.5-lightning:free",
    "liquid/lfm-2.5-2.6b:free"
];

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string | any[];
}

export interface OpenRouterResponse {
    content: string;
    model: string;
    success: boolean;
    error?: string;
}

/**
 * Call OpenRouter Chat Completions API with automatic model retry across free/standby models.
 */
export async function callOpenRouter(
    messages: ChatMessage[],
    requestedModel?: string,
    temperature = 0.4
): Promise<OpenRouterResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY;

    if (!apiKey) {
        return {
            content: "",
            model: requestedModel || "unknown",
            success: false,
            error: "OPENROUTER_API_KEY is not configured on the server."
        };
    }

    const modelsToTry = requestedModel 
        ? [requestedModel, ...OPENROUTER_FALLBACK_MODELS.filter(m => m !== requestedModel)]
        : [OPENROUTER_FREE_MODEL, ...OPENROUTER_FALLBACK_MODELS];

    let lastError = "";

    for (const model of modelsToTry) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": SITE_URL,
                    "X-Title": SITE_NAME,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens: 1500
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errText = await res.text();
                console.warn(`[OpenRouter] Model ${model} returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
                lastError = `OpenRouter error (${res.status}): ${errText.slice(0, 150)}`;
                continue; // Try next fallback model
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim();

            if (reply) {
                return {
                    content: reply,
                    model: data.model || model,
                    success: true
                };
            }
        } catch (err: any) {
            console.warn(`[OpenRouter] Call failed for model ${model}:`, err?.message || err);
            lastError = err?.message || "OpenRouter connection failed";
        }
    }

    return {
        content: "",
        model: requestedModel || modelsToTry[0],
        success: false,
        error: lastError || "All OpenRouter models failed to respond."
    };
}
