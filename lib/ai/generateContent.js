import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateAiContent(systemPrompt, userPrompt) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY globally');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: systemPrompt });

    try {
        const result = await model.generateContent(userPrompt);
        return result.response.text();
    } catch (e) {
        console.error("Gemini AI API failure:", e);
        throw e;
    }
}
