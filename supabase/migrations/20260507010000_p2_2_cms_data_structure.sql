-- Phase 2.2: CMS data structure foundation.
-- Additive only: nullable columns, minimal nullable tables, no unique constraints,
-- no foreign keys, no routing/runtime behavior changes.

BEGIN;

ALTER TABLE public.custom_pages
    ADD COLUMN IF NOT EXISTS parent_id UUID,
    ADD COLUMN IF NOT EXISTS full_slug TEXT,
    ADD COLUMN IF NOT EXISTS page_type TEXT,
    ADD COLUMN IF NOT EXISTS topic_id UUID,
    ADD COLUMN IF NOT EXISTS category_id UUID,
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS robots_setting TEXT;

ALTER TABLE public.content_drafts
    ADD COLUMN IF NOT EXISTS parent_id UUID,
    ADD COLUMN IF NOT EXISTS full_slug TEXT,
    ADD COLUMN IF NOT EXISTS page_type TEXT,
    ADD COLUMN IF NOT EXISTS intent_type TEXT,
    ADD COLUMN IF NOT EXISTS keywords JSONB,
    ADD COLUMN IF NOT EXISTS tone TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS prompt_template_id UUID;

ALTER TABLE public.page_index
    ADD COLUMN IF NOT EXISTS parent_id UUID,
    ADD COLUMN IF NOT EXISTS full_slug TEXT,
    ADD COLUMN IF NOT EXISTS content_type TEXT,
    ADD COLUMN IF NOT EXISTS intent_type TEXT,
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS robots_setting TEXT;

ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS category_id UUID,
    ADD COLUMN IF NOT EXISTS topic_id UUID,
    ADD COLUMN IF NOT EXISTS excerpt TEXT,
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS robots_setting TEXT;

CREATE TABLE IF NOT EXISTS public.content_topics (
    id UUID DEFAULT gen_random_uuid(),
    name TEXT,
    slug TEXT,
    description TEXT,
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.content_categories (
    id UUID DEFAULT gen_random_uuid(),
    topic_id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.internal_links (
    id UUID DEFAULT gen_random_uuid(),
    source_type TEXT,
    source_id UUID,
    source_slug TEXT,
    target_type TEXT,
    target_id UUID,
    target_slug TEXT,
    anchor_text TEXT,
    context TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.redirects (
    id UUID DEFAULT gen_random_uuid(),
    source_path TEXT,
    target_path TEXT,
    status_code INTEGER,
    reason TEXT,
    active BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    role TEXT,
    tone TEXT,
    intent_type TEXT,
    template_body TEXT,
    variables JSONB,
    keywords JSONB,
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

UPDATE public.custom_pages
SET full_slug = slug
WHERE full_slug IS NULL
  AND slug IS NOT NULL;

UPDATE public.content_drafts
SET full_slug = slug
WHERE full_slug IS NULL
  AND slug IS NOT NULL;

UPDATE public.page_index
SET full_slug = page_slug
WHERE full_slug IS NULL
  AND page_slug IS NOT NULL;

COMMIT;
