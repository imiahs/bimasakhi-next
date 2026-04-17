/**
 * TOOL: generate_content — AI content generation via Gemini
 * Wraps existing lib/ai/generateContent.js
 */
import { registerTool } from './index';
import { generateContent } from '@/lib/ai/generateContent';

registerTool('generate_content', {
    timeout: 60000,
    retries: 2,
    costPerCall: 0.001, // ~$0.001 per Gemini Flash call
    version: '1.0.0',

    validateInput: (input) => {
        if (!input.prompt) return { valid: false, reason: 'prompt required' };
        return { valid: true };
    },

    validateOutput: (result) => {
        if (!result || typeof result !== 'string' || result.length < 10) {
            return { valid: false, reason: 'AI returned empty or too short response' };
        }
        return { valid: true };
    },

    execute: async (input) => {
        return await generateContent(input.prompt, input.systemPrompt);
    },
});
