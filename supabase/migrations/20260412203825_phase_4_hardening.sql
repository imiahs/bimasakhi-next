-- Phase 4 Automation Hardening

-- STEP 2: Dead Letter Table
CREATE TABLE IF NOT EXISTS job_dead_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    failed_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Idempotency Key (Prevent Duplicate Jobs)
-- Use a unique index on job_type + event_id inside the JSONB payload
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_queue_type_event 
ON job_queue (job_type, (payload->>'event_id')) 
WHERE (payload->>'event_id') IS NOT NULL;
