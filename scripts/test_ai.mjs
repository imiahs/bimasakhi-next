import { generateAiContent } from '../lib/ai/generateContent.js';
async function test() {
    try {
        const prompt = `Write a short 50-word test string. Format JSON: { "data": "string" }`;
        const result = await generateAiContent("You are an expert", prompt);
        console.log("AI_RESULT:", result);
    } catch(e) {
        console.log("AI_ERROR:", e.message);
    }
}
test();
