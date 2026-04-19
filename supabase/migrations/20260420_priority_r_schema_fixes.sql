-- Priority R Schema Fixes: Add missing columns for alt text, media linking, thumbnails
-- Date: 2026-04-20
-- Fixes: 3e (alt text in drafts), 3h (draft_id FK in media_files), media thumbnail_url

-- 1. Add featured_image_alt to content_drafts (Fix 3e: SEO alt text for featured images)
ALTER TABLE public.content_drafts
ADD COLUMN IF NOT EXISTS featured_image_alt TEXT;

-- 2. Add draft_id FK to media_files (Fix 3h: link media to drafts)
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS draft_id UUID REFERENCES public.content_drafts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_files_draft_id ON public.media_files(draft_id);

-- 3. Add alt_text to media_files (media library alt text support)
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- 4. Add thumbnail_url to media_files (referenced by upload API but column was missing)
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
