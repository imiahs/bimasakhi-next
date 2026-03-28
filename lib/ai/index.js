import { generateAiContent as generateGeminiContent } from './generateContent';

const ACTION_SYSTEM_PROMPTS = {
    general: 'You are the Bima Sakhi AI operating layer. Return concise, production-safe outputs.',
    'lead-analysis': 'You are an expert data analyst summarizing lead generation and funnel telemetry into concise operator guidance.',
    'page-seo-analysis': 'You are a technical SEO audit engine. Return only JSON with score, suggestions, generated_keywords, and internal_links.'
};

function buildContextPrompt(prompt, context) {
    const payload = { ...(context || {}) };
    delete payload.action;

    if (Object.keys(payload).length === 0) {
        return prompt;
    }

    return `${prompt}\n\nContext:\n${JSON.stringify(payload, null, 2)}`;
}

function parseJsonSafely(text, fallback) {
    try {
        let clean = text.trim();
        if (clean.startsWith('```json')) clean = clean.substring(7);
        else if (clean.startsWith('```')) clean = clean.substring(3);
        if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
        return JSON.parse(clean.trim());
    } catch {
        return fallback;
    }
}

export async function generateAiContent(prompt, context = {}) {
    if (typeof context === 'string') {
        const looksLikeSystemPrompt =
            /^\s*you are\b/i.test(prompt) ||
            prompt.includes('Output ONLY') ||
            prompt.includes('Do not include markdown');

        const systemPrompt = looksLikeSystemPrompt
            ? prompt
            : ACTION_SYSTEM_PROMPTS.general;

        const userPrompt = looksLikeSystemPrompt
            ? context
            : [prompt, context].filter(Boolean).join('\n\n');

        const result = await generateGeminiContent(systemPrompt, userPrompt);

        if (!result) {
            throw new Error('Gemini generation failed');
        }

        return result;
    }

    const action = context?.action || 'general';
    const systemPrompt = ACTION_SYSTEM_PROMPTS[action] || ACTION_SYSTEM_PROMPTS.general;
    const result = await generateGeminiContent(systemPrompt, buildContextPrompt(prompt, context));

    if (!result) {
        throw new Error('Gemini generation failed');
    }

    if (action === 'page-seo-analysis') {
        return parseJsonSafely(result, {
            score: 50,
            suggestions: ['AI returned non-JSON analysis output'],
            generated_keywords: [],
            internal_links: []
        });
    }

    return result;
}
