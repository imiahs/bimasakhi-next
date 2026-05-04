-- P1 Fix: generation_queue missing columns
-- Adds metadata, slug columns that are referenced by application code
-- but were never included in the original 018_generation_queue_schema.sql
--
-- Root cause: 018_generation_queue_schema.sql created the table without metadata/slug.
-- phase_4_6 added priority + created_by, but metadata and slug were never added.
-- generate-single/route.js inserts both; pagegen/route.js reads payload->pages[].slug
-- but generate-single inserts top-level slug for single-page jobs.

-- 1. Add metadata column (JSONB, nullable, default empty object)
ALTER TABLE public.generation_queue
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add slug column (TEXT, nullable) — used by single-page generation to track the slug directly
ALTER TABLE public.generation_queue
    ADD COLUMN IF NOT EXISTS slug TEXT;

-- 3. Index on slug for fast lookup
CREATE INDEX IF NOT EXISTS idx_generation_queue_slug
    ON public.generation_queue(slug)
    WHERE slug IS NOT NULL;

-- 4. Backfill slug from payload->>'slug' for existing single-page jobs
UPDATE public.generation_queue
SET slug = payload->>'slug'
WHERE slug IS NULL
  AND payload->>'slug' IS NOT NULL;

-- Verification comment: after applying, run:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'generation_queue'
--   ORDER BY ordinal_position;
-- Expected: id, task_type, payload, status, progress, total_items, retry_count, max_retries,
--           created_at, completed_at, priority, created_by, metadata, slug
