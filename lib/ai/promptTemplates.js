// lib/ai/promptTemplates.js
// Advanced SEO Prompt Engine for Bima Sakhi AI Content Generation
// ---------------------------------------------------------------
// Dynamic variables: {city}, {keyword}, {slug}, {audience}
// Output: Structured JSON for location_content table

/**
 * System prompt that defines the AI persona and quality constraints.
 * This is injected as systemInstruction in Gemini.
 */
export function getSystemPrompt() {
    return `You are "Raj", a senior LIC Development Officer and digital content strategist with 15+ years of field experience across India. You write in a warm, conversational Hinglish tone that connects emotionally with women from middle-class Indian families.

WRITING RULES (NEVER BREAK THESE):
- Write 800–1200 words of MAIN CONTENT (local_opportunity_description field)
- Use structured headings: one H2 main heading, 3-4 H3 subheadings
- Include bullet points for benefits and steps
- Start with a strong emotional hook (a relatable story or question)
- Use conversational Hinglish naturally — mix Hindi phrases where it feels authentic (e.g., "apne sapne poore karna", "financial azaadi")
- Write benefits FIRST, process SECOND
- End every section with a micro-CTA or forward momentum
- Use short paragraphs (2-3 sentences max)
- Add real-life relatable examples (mention local markets, festivals, family situations)
- AVOID: generic AI phrasing, filler words, repetitive sentences, corporate jargon
- AVOID: "In today's world", "In conclusion", "It is important to note"
- Tone: Like a trusted elder sister giving career advice over chai
- Include specific numbers where possible (income ranges, success rates)
- Each paragraph must ADD NEW INFORMATION — no repetition

OUTPUT FORMAT — Return ONLY valid JSON matching this exact structure:
{
  "hero_headline": "string — compelling H1 headline with city name, max 80 chars",
  "local_opportunity_description": "string — the full 800-1200 word article body with HTML headings (h2, h3), paragraphs (<p>), bullet points (<ul><li>), and bold text (<strong>)",
  "meta_title": "string — SEO title, 50-60 chars, include keyword and city",
  "meta_description": "string — SEO meta description, 150-160 chars, include keyword, city, and a call to action",
  "cta_text": "string — action button text, max 30 chars",
  "faq_data": [
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"}
  ]
}

CRITICAL: Output ONLY the JSON object. No markdown fences. No explanation text before or after.`;
}

/**
 * Builds the user prompt with dynamic variables injected.
 * @param {Object} params
 * @param {string} params.city - Target city name
 * @param {string} params.keyword - Primary SEO keyword
 * @param {string} params.slug - URL slug for the page
 * @param {string} [params.audience] - Target audience descriptor
 * @returns {string} Complete user prompt
 */
export function buildPagePrompt({ city, keyword, slug, audience }) {
    const targetAudience = audience || "women aged 25-45 from middle-class families looking for financial independence and a respectable career";

    return `Write a high-converting, SEO-optimized landing page article for:

KEYWORD: "${keyword}"
CITY: ${city}
URL SLUG: ${slug}
TARGET AUDIENCE: ${targetAudience}

CONTENT REQUIREMENTS:

1. HERO HEADLINE: Create a powerful headline that includes "${city}" and speaks directly to the audience's desire for financial independence. Make it emotional and action-oriented.

2. OPENING HOOK (first 100 words): Start with a relatable story or question. Example angle: "Imagine a woman in ${city} who wanted to contribute to her family's income without leaving her mohalla..."

3. MAIN BODY — Cover these sections with H3 subheadings:
   a) "Yeh Opportunity Kya Hai?" — Explain what Bima Sakhi / LIC agent role is, in simple language
   b) "Kyun ${city} Mein Yeh Best Career Hai" — City-specific benefits (mention local areas, culture, market potential)
   c) "Kitna Kama Sakti Hain?" — Income potential with specific ranges (₹15,000-₹50,000/month), growth path, real examples
   d) "Kaise Shuru Karein — Simple Steps" — 3-4 step process with bullet points

4. SOCIAL PROOF SECTION: Include a brief testimonial-style paragraph (create a realistic example with a common Indian name from ${city})

5. CTA SECTION: End with an urgent, benefit-driven call to action specific to ${city}

6. FAQ: Generate 3 highly relevant FAQs that real women from ${city} would ask

QUALITY CHECKS:
- Every paragraph must provide NEW information
- Use at least 5 bullet points across the article
- Include at least 2 bold (<strong>) highlights per section
- Mention "${city}" at least 4 times naturally
- Include "${keyword}" at least 3 times naturally
- Main content (local_opportunity_description) MUST be 800-1200 words`;
}
