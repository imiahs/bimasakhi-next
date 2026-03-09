// Production OpenAI Provider Wrapper
export async function generateWithOpenAI(prompt, context) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key missing in environment variables.");

    const action = context.action || 'general';
    let systemPrompt = "You are an expert AI assistant for an Indian LIC insurance advisory firm.";

    // Customize system prompts based on task type
    if (action === 'generate-blog-outline') {
        systemPrompt = "You are an expert SEO content strategist. Generate a clean numbered outline for a blog post based on the requested topic.";
    } else if (action === 'generate-seo-title') {
        systemPrompt = "You are an expert SEO copywriter. Generate ONE high-converting SEO title (max 60 characters) based on the keywords.";
    } else if (action === 'generate-seo-desc') {
        systemPrompt = "You are an expert SEO copywriter. Generate ONE high-converting Meta Description (max 155 characters) summarizing the topic perfectly.";
    } else if (action === 'lead-analysis') {
        systemPrompt = "You are an expert Data Analyst summarizing Lead generation metadata into a 3-sentence actionable insight paragraph.";
    } else if (action === 'page-seo-analysis') {
        systemPrompt = "You are a technical SEO audit tool. Read the provided page textual context and return a JSON object with schema: { score: Number(1-100), suggestions: [String], generated_keywords: [String], internal_links: [String(slugs)] }.";
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const resultText = data.choices[0].message.content.trim();

        // If the action is expected to return JSON, parse it safely
        if (action === 'page-seo-analysis') {
            try {
                // simple strip of markdown formatting if any
                const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '');
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse OpenAI JSON response", e);
                return { score: 50, suggestions: ['Parse error on AI result'], generated_keywords: [], internal_links: [] };
            }
        }

        return resultText;

    } catch (error) {
        throw new Error(`OpenAI Provider Error: ${error.message}`);
    }
}
