-- PRODUCTION HARDENING: Atomic idempotency table
-- Replaces the non-atomic observability_logs approach with a proper unique constraint

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL DEFAULT 'default',
    event_id TEXT,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(idempotency_key);

-- Auto-cleanup: remove keys older than 7 days (optional, run via cron)
-- DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '7 days';
