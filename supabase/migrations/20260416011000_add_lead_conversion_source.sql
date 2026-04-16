-- Phase 4.6 follow-up: reconcile missing leads.conversion_source on live systems
-- Safe and additive only: no column removals, no NOT NULL enforcement.

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS conversion_source TEXT;

UPDATE public.leads
SET conversion_source = COALESCE(NULLIF(source, ''), 'unknown')
WHERE conversion_source IS NULL;

NOTIFY pgrst, 'reload schema';
