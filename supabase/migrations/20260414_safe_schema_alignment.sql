-- =========================
-- SAFE SCHEMA ALIGNMENT
-- =========================

-- JOB_RUNS ALIGNMENT
ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE job_runs ADD COLUMN IF NOT EXISTS error TEXT;

-- Ensure defaults (avoid NULL chaos)
ALTER TABLE job_runs ALTER COLUMN status SET DEFAULT 'processing';

-- JOB_DEAD_LETTERS ALIGNMENT
ALTER TABLE job_dead_letters ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE job_dead_letters ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE job_dead_letters ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ DEFAULT NOW();

-- =========================
-- PERFORMANCE INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
