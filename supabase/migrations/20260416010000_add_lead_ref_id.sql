-- Phase 4.6 follow-up: reconcile missing leads.ref_id on live systems
-- Safe and additive only: no column removals, no NOT NULL enforcement.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS ref_id TEXT;

WITH backfill AS (
    SELECT
        id,
        format(
            'LEAD-%s-%s',
            to_char(COALESCE(created_at, NOW()), 'YYYYMMDDHH24MISSMS'),
            upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8))
        ) AS generated_ref_id
    FROM public.leads
    WHERE ref_id IS NULL
)
UPDATE public.leads AS leads
SET ref_id = backfill.generated_ref_id
FROM backfill
WHERE leads.id = backfill.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_ref_id_unique
    ON public.leads(ref_id)
    WHERE ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_ref_id
    ON public.leads(ref_id);

NOTIFY pgrst, 'reload schema';
