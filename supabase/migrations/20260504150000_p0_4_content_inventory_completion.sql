BEGIN;

ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.blog_posts
SET
    updated_at = COALESCE(updated_at, created_at, timezone('utc'::text, now())),
    published_at = CASE
        WHEN status = 'published' THEN COALESCE(published_at, created_at, timezone('utc'::text, now()))
        ELSE published_at
    END,
    archived_at = CASE
        WHEN status = 'archived' THEN COALESCE(archived_at, timezone('utc'::text, now()))
        ELSE NULL
    END;

ALTER TABLE public.blog_posts
    ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

ALTER TABLE public.blog_posts
    DROP CONSTRAINT IF EXISTS blog_posts_status_check;

ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_status_check
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_updated_at ON public.blog_posts(updated_at DESC);

ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.resources
SET
    status = COALESCE(NULLIF(status, ''), 'published'),
    updated_at = COALESCE(updated_at, created_at, timezone('utc'::text, now())),
    published_at = CASE
        WHEN COALESCE(NULLIF(status, ''), 'published') = 'published' THEN COALESCE(published_at, created_at, timezone('utc'::text, now()))
        ELSE published_at
    END,
    archived_at = CASE
        WHEN COALESCE(NULLIF(status, ''), 'published') = 'archived' THEN COALESCE(archived_at, timezone('utc'::text, now()))
        ELSE NULL
    END;

ALTER TABLE public.resources
    ALTER COLUMN status SET DEFAULT 'draft',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

ALTER TABLE public.resources
    DROP CONSTRAINT IF EXISTS resources_status_check;

ALTER TABLE public.resources
    ADD CONSTRAINT resources_status_check
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_updated_at ON public.resources(updated_at DESC);

COMMIT;