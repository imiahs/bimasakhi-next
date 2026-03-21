const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
        if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    });
} catch(e) {}

// Inline the prompt templates (since they use ESM exports)
function getSystemPrompt() {
    return `You are "Raj", a senior LIC Development Officer and digital content strategist with 15+ years of field experience across India. You write in a warm, conversational Hinglish tone that connects emotionally with women from middle-class Indian families.

WRITING RULES (NEVER BREAK THESE):
- Write 800-1200 words of MAIN CONTENT (local_opportunity_description field)
- Use structured headings: one H2 main heading, 3-4 H3 subheadings
- Include bullet points for benefits and steps
- Start with a strong emotional hook (a relatable story or question)
- Use conversational Hinglish naturally
- Write benefits FIRST, process SECOND
- End every section with a micro-CTA or forward momentum
- Use short paragraphs (2-3 sentences max)
- Add real-life relatable examples
- AVOID: generic AI phrasing, filler words, repetitive sentences, corporate jargon
- AVOID: "In today's world", "In conclusion", "It is important to note"
- Tone: Like a trusted elder sister giving career advice over chai
- Include specific numbers where possible

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "hero_headline": "string max 80 chars",
  "local_opportunity_description": "string 800-1200 words with HTML",
  "meta_title": "string 50-60 chars",
  "meta_description": "string 150-160 chars",
  "cta_text": "string max 30 chars",
  "faq_data": [{"question":"string","answer":"string"},{"question":"string","answer":"string"},{"question":"string","answer":"string"}]
}

CRITICAL: Output ONLY the JSON object. No markdown fences. No explanation.`;
}

function buildPagePrompt({ city, keyword, slug }) {
    return `Write a high-converting, SEO-optimized landing page article for:

KEYWORD: "${keyword}"
CITY: ${city}
URL SLUG: ${slug}
TARGET AUDIENCE: women aged 25-45 from middle-class families looking for financial independence

CONTENT REQUIREMENTS:
1. HERO HEADLINE: Powerful headline with "${city}", emotional and action-oriented
2. OPENING HOOK: Relatable story or question about a woman in ${city}
3. MAIN BODY with H3 subheadings:
   a) "Yeh Opportunity Kya Hai?" — what Bima Sakhi / LIC agent role is
   b) "Kyun ${city} Mein Yeh Best Career Hai" — city-specific benefits
   c) "Kitna Kama Sakti Hain?" — income ₹15,000-₹50,000/month
   d) "Kaise Shuru Karein" — 3-4 step process with bullets
4. SOCIAL PROOF: Brief testimonial-style paragraph
5. CTA: Urgent, benefit-driven call to action for ${city}
6. FAQ: 3 relevant FAQs

QUALITY: Every paragraph adds NEW info. Use 5+ bullet points. Mention "${city}" 4+ times, "${keyword}" 3+ times. 800-1200 words minimum.`;
}

const PRIMARY_MODEL = "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-2.0-flash-lite";

async function testAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.error("No API key"); process.exit(1); }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildPagePrompt({ city: "Delhi", keyword: "lic agent banne ka tarika Delhi", slug: "lic-agent-delhi" });

    for (const modelName of modelsToTry) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
            const result = await model.generateContent(userPrompt);
            const text = result.response.text();
            console.log(`✅ ${modelName} returned ${text.length} chars`);

            // Try parsing
            let clean = text.trim();
            if (clean.startsWith('```json')) clean = clean.substring(7);
            else if (clean.startsWith('```')) clean = clean.substring(3);
            if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
            clean = clean.trim();

            const parsed = JSON.parse(clean);
            console.log("\n--- PARSED OUTPUT ---");
            console.log("Headline:", parsed.hero_headline);
            console.log("Meta Title:", parsed.meta_title);
            console.log("Meta Desc:", parsed.meta_description);
            console.log("CTA:", parsed.cta_text);
            console.log("FAQs:", parsed.faq_data?.length || 0);

            const mainContent = parsed.local_opportunity_description || '';
            const wordCount = mainContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
            console.log("Word Count:", wordCount);

            if (wordCount > 300) {
                console.log("✅ CONTENT QUALITY CHECK PASSED");
            } else {
                console.log("❌ CONTENT TOO SHORT");
            }

            // Save full output
            fs.writeFileSync('ai_sample_output.json', JSON.stringify(parsed, null, 2));
            console.log("\nFull output saved to ai_sample_output.json");
            return; // Success — stop
        } catch(e) {
            console.error(`❌ ${modelName} failed:`, e.message);
        }
    }
    console.error("All models failed.");
    process.exit(1);
}
testAI();
