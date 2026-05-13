-- Phase 2.4: AI prompt engine foundation.
-- Additive only: nullable prompt metadata storage and default template seed.

BEGIN;

ALTER TABLE public.content_drafts
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS prompt_inputs JSONB;

ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS prompt_template_id UUID,
    ADD COLUMN IF NOT EXISTS intent_type TEXT,
    ADD COLUMN IF NOT EXISTS keywords JSONB,
    ADD COLUMN IF NOT EXISTS tone TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS prompt_inputs JSONB;

ALTER TABLE public.bulk_generation_jobs
    ADD COLUMN IF NOT EXISTS prompt_template_id UUID,
    ADD COLUMN IF NOT EXISTS prompt_role TEXT,
    ADD COLUMN IF NOT EXISTS prompt_tone TEXT,
    ADD COLUMN IF NOT EXISTS prompt_keywords JSONB,
    ADD COLUMN IF NOT EXISTS prompt_location TEXT,
    ADD COLUMN IF NOT EXISTS prompt_intent TEXT,
    ADD COLUMN IF NOT EXISTS prompt_inputs JSONB;

INSERT INTO public.prompt_templates (
    name,
    description,
    role,
    tone,
    intent_type,
    template_body,
    variables,
    keywords,
    status,
    metadata,
    created_at,
    updated_at
)
SELECT
    'P2 Default Page Generation',
    'Default DB-backed page generation template seeded from the legacy hardcoded page prompt.',
    'Senior LIC Development Officer and digital content strategist',
    'warm, conversational Hinglish',
    'local_service',
    $template$Write a high-converting, SEO-optimized landing page article for:

KEYWORD: "{{keyword}}"
CITY: {{location}}
URL SLUG: {{slug}}
TARGET AUDIENCE: {{audience}}
ROLE: {{role}}
TONE: {{tone}}
INTENT: {{intent}}
SECONDARY KEYWORDS: {{keywords}}

CONTENT REQUIREMENTS:

1. HERO HEADLINE: Create a powerful headline that includes "{{location}}" and speaks directly to the audience's desire for financial independence. Make it emotional and action-oriented.

2. OPENING HOOK (first 100 words): Start with a relatable story or question. Example angle: "Imagine a woman in {{location}} who wanted to contribute to her family's income without leaving her mohalla..."

3. MAIN BODY - Cover these sections with H3 subheadings:
   a) "Yeh Opportunity Kya Hai?" - Explain what Bima Sakhi / LIC agent role is, in simple language
   b) "Kyun {{location}} Mein Yeh Best Career Hai" - Location-specific benefits
   c) "Kitna Kama Sakti Hain?" - Income potential with specific ranges, growth path, real examples
   d) "Kaise Shuru Karein - Simple Steps" - 3-4 step process with bullet points

4. SOCIAL PROOF SECTION: Include a brief testimonial-style paragraph with a realistic example from {{location}}

5. CTA SECTION: End with an urgent, benefit-driven call to action specific to {{location}}

6. FAQ: Generate 3 highly relevant FAQs that real women from {{location}} would ask

QUALITY CHECKS:
- Every paragraph must provide NEW information
- Use at least 5 bullet points across the article
- Include at least 2 bold (<strong>) highlights per section
- Mention "{{location}}" at least 4 times naturally
- Include "{{keyword}}" at least 3 times naturally
- Main content (local_opportunity_description) MUST be 800-1200 words$template$,
    '["keyword","location","slug","audience","role","tone","intent","keywords"]'::jsonb,
    '["LIC agent","Bima Sakhi","insurance advisor"]'::jsonb,
    'active',
    jsonb_build_object(
        'default', true,
        'key', 'p2_default_page_generation',
        'seeded_from', 'legacy_hardcoded_page_prompt'
    ),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
WHERE NOT EXISTS (
    SELECT 1
    FROM public.prompt_templates
    WHERE metadata ->> 'key' = 'p2_default_page_generation'
);

COMMIT;
