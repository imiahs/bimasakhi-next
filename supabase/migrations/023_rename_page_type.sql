-- 023_rename_page_type.sql

-- 1. Create the final page_type column and copy over data from crawl_priority
ALTER TABLE public.page_index ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'locality_page';
UPDATE public.page_index SET page_type = crawl_priority;

-- 2. Drop the old enum check if it exists (it might have been created by 022)
ALTER TABLE public.page_index DROP CONSTRAINT IF EXISTS page_index_crawl_priority_check;

-- 3. Clear existing crawl_priority data and cast it properly to allow high/medium/low
UPDATE public.page_index SET crawl_priority = 'medium';

-- 4. Apply the strict CHECK constraint for the new crawl architecture
ALTER TABLE public.page_index 
    ALTER COLUMN crawl_priority TYPE VARCHAR(20),
    ALTER COLUMN crawl_priority SET DEFAULT 'medium',
    ADD CONSTRAINT page_index_crawl_priority_check CHECK (crawl_priority IN ('high', 'medium', 'low'));
