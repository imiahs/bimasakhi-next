-- Fix 1f: Add draft_id FK to media_files table
-- Links uploaded media to specific content drafts
-- Priority R, Stage 1, Sub-stage 1f

ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS draft_id UUID REFERENCES public.content_drafts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_files_draft_id ON public.media_files(draft_id);
