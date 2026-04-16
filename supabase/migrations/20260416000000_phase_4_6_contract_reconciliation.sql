-- Phase 4.6: Contract Reconciliation and Runtime Recovery
-- Canonicalizes queue, worker, contact, and telemetry contracts without replaying unknown historical migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contact inquiries: restore canonical business fields used by the runtime.
ALTER TABLE public.contact_inquiries
    ADD COLUMN IF NOT EXISTS contact_id TEXT,
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS pipeline TEXT,
    ADD COLUMN IF NOT EXISTS tag TEXT,
    ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

UPDATE public.contact_inquiries
SET
    contact_id = COALESCE(contact_id, 'CNT-LEGACY-' || REPLACE(id::text, '-', '')),
    sync_status = COALESCE(sync_status, 'pending')
WHERE contact_id IS NULL OR sync_status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_inquiries_contact_id
    ON public.contact_inquiries(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at
    ON public.contact_inquiries(created_at DESC);

-- Contact event ledger for async contact worker.
CREATE TABLE IF NOT EXISTS public.contact_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_events_contact_created
    ON public.contact_events(contact_id, created_at DESC);

-- Canonical operational ledgers.
ALTER TABLE public.job_runs
    ADD COLUMN IF NOT EXISTS job_id UUID,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error TEXT;

ALTER TABLE public.job_dead_letters
    ADD COLUMN IF NOT EXISTS job_id UUID,
    ADD COLUMN IF NOT EXISTS error TEXT,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_job_runs_status_created
    ON public.job_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_dead_letters_failed_at
    ON public.job_dead_letters(failed_at DESC NULLS LAST, created_at DESC);

-- Queue canonicalization.
ALTER TABLE public.generation_queue
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS created_by TEXT;

UPDATE public.generation_queue
SET task_type = 'pagegen'
WHERE task_type = 'page_generation';

UPDATE public.generation_queue
SET total_items = COALESCE(jsonb_array_length(payload->'pages'), 0)
WHERE COALESCE(total_items, 0) = 0;

CREATE INDEX IF NOT EXISTS idx_generation_queue_task_status_created_phase46
    ON public.generation_queue(task_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_created
    ON public.job_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_created_phase46
    ON public.lead_events(lead_id, created_at DESC);

-- Lead sync state repair.
UPDATE public.leads
SET sync_status = 'completed'
WHERE COALESCE(sync_status, 'pending') <> 'completed'
  AND (
      zoho_lead_id IS NOT NULL
      OR EXISTS (
          SELECT 1
          FROM public.lead_events le
          WHERE le.lead_id = public.leads.id
            AND le.event_type = 'zoho_synced'
      )
  );

NOTIFY pgrst, 'reload schema';
