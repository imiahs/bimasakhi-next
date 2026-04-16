-- Safe Schema Alignment Migration
-- ADD missing columns ONLY WITHOUT breaking existing production system

-- job_runs
ALTER TABLE public.job_runs ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE public.job_runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.job_runs ADD COLUMN IF NOT EXISTS error TEXT;

-- job_dead_letters
ALTER TABLE public.job_dead_letters ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE public.job_dead_letters ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.job_dead_letters ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
