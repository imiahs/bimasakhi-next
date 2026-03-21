import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeLog } from '@/lib/safeLogger.js';

// Model priority: env override → primary → fallback
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/**
 * Resilient AI content generator with retry logic and model fallback.
 * NEVER throws — returns null on persistent failure so the pipeline can skip gracefully.
 *
 * @param {string} systemPrompt - System instruction for AI persona
 * @param {string} userPrompt - The actual content generation prompt
 * @returns {Promise<string|null>} Generated text or null on failure
 */
export async function generateAiContent(systemPrompt, userPrompt) {
    if (!process.env.GEMINI_API_KEY) {
        console.error('[AI Engine] GEMINI_API_KEY is missing — cannot generate content');
        return null;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];

    for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemPrompt,
                });

                const result = await model.generateContent(userPrompt);
                const text = result.response.text();

                if (!text || text.trim().length < 50) {
                    console.warn(`[AI Engine] Empty/short response from ${modelName} (attempt ${attempt})`);
                    continue;
                }

                console.log(`[AI Engine] ✅ Success with model=${modelName} attempt=${attempt} chars=${text.length}`);
                return text;
            } catch (e) {
                const errorMsg = e.message || String(e);
                console.error(`[AI Engine] ❌ ${modelName} attempt ${attempt}/${MAX_RETRIES}: ${errorMsg}`);

                // If model is not found (404), skip retries and try next model
                if (errorMsg.includes('404') || errorMsg.includes('not found')) {
                    console.warn(`[AI Engine] Model ${modelName} not available, trying fallback...`);
                    break;
                }

                // Rate limit (429) — wait longer before retry
                if (errorMsg.includes('429') || errorMsg.includes('quota')) {
                    console.warn(`[AI Engine] Rate limited, waiting ${RETRY_DELAY_MS * 2}ms...`);
                    await sleep(RETRY_DELAY_MS * 2);
                    continue;
                }

                // Other errors — short delay then retry
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS);
                }
            }
        }
    }

    console.error(`[AI Engine] All models exhausted. Returning null (pipeline will skip this page).`);
    
    // TASK 6: AI FAILURE VISIBILITY
    safeLog('AI_FAILURE', 'AI returned null', {
        model_attempted: PRIMARY_MODEL // fallback also logged conceptually
    });

    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
