-- =============================================================
-- EVENT STORE — Write-Ahead Log for Business Events
-- =============================================================
-- Every business event is persisted BEFORE dispatch.
-- If QStash/bus fails, the event remains in DB for retry.
-- This guarantees ZERO data loss.
-- =============================================================

CREATE TABLE IF NOT EXISTS event_store (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'api',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'dispatched', 'failed', 'completed', 'skipped')),
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('critical', 'normal')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    dispatch_message_id TEXT,
    execution_context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for retry daemon (scan pending/failed events)
CREATE INDEX IF NOT EXISTS idx_event_store_status ON event_store(status);
CREATE INDEX IF NOT EXISTS idx_event_store_status_priority ON event_store(status, priority);
CREATE INDEX IF NOT EXISTS idx_event_store_created_at ON event_store(created_at);
CREATE INDEX IF NOT EXISTS idx_event_store_event_name ON event_store(event_name);

-- Add system_mode column to system_control_config
ALTER TABLE system_control_config
    ADD COLUMN IF NOT EXISTS system_mode TEXT NOT NULL DEFAULT 'normal'
    CHECK (system_mode IN ('normal', 'degraded', 'emergency'));

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'event_store' ORDER BY ordinal_position;
