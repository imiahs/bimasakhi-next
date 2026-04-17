-- Session 3: Event Completion Tracking + Trace columns
-- Run this AFTER create_event_store.sql

-- Worker result storage (Rule 1-2: completion ACK carries execution details)
ALTER TABLE event_store ADD COLUMN IF NOT EXISTS worker_result JSONB DEFAULT NULL;

-- Top-level correlation_id for fast querying (Rule 4: end-to-end trace)
ALTER TABLE event_store ADD COLUMN IF NOT EXISTS correlation_id TEXT DEFAULT NULL;

-- Index for timeline queries (Rule 5)
CREATE INDEX IF NOT EXISTS idx_event_store_correlation_id ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;

-- Index for stuck detection (Rule 3)
CREATE INDEX IF NOT EXISTS idx_event_store_dispatched_status ON event_store(status, dispatched_at) WHERE status = 'dispatched';

-- Index for metrics queries (Rule 7)
CREATE INDEX IF NOT EXISTS idx_event_store_status ON event_store(status);
CREATE INDEX IF NOT EXISTS idx_event_store_completed ON event_store(completed_at) WHERE status = 'completed';
