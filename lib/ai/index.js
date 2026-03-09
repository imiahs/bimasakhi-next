import { generateWithOpenAI } from './providers/openai';
import { generateWithLocal } from './providers/local';

export async function generateAiContent(prompt, context = {}) {
    // If provider is set to openai AND key exists, try openAI
    // Otherwise automatically fallback to local simulation
    const provider = process.env.AI_PROVIDER;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (provider === 'openai' && hasOpenAIKey) {
        try {
            return await generateWithOpenAI(prompt, context);
        } catch (error) {
            console.error('OpenAI generation failed, falling back to local simulation:', error);
            // Fallthrough to local on failure
        }
    }

    return await generateWithLocal(prompt, context);
}
