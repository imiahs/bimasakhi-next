-- Migration: Admin OS v2 — System Control Engine
-- Creates the centralized system_config (singleton) and system_logs tables

-- 1. SYSTEM CONFIG TABLE (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.system_control_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton_key BOOLEAN UNIQUE NOT NULL DEFAULT TRUE,
    ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    queue_paused BOOLEAN NOT NULL DEFAULT TRUE,
    batch_size INTEGER NOT NULL DEFAULT 5,
    crm_auto_routing BOOLEAN NOT NULL DEFAULT FALSE,
    followup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce EXACTLY ONE ROW via CHECK constraint
    CONSTRAINT system_control_config_singleton CHECK (singleton_key = TRUE)
);

-- Seed the singleton row (safe — ON CONFLICT does nothing if exists)
INSERT INTO public.system_control_config (singleton_key, ai_enabled, queue_paused, batch_size, crm_auto_routing, followup_enabled)
VALUES (TRUE, FALSE, TRUE, 5, FALSE, FALSE)
ON CONFLICT (singleton_key) DO NOTHING;

-- 2. SYSTEM LOGS TABLE (Audit Trail) - STANDARDIZED TO observability_logs
CREATE TABLE IF NOT EXISTS public.observability_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(50) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    source VARCHAR(255) NOT NULL DEFAULT 'system',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for time-range queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_observability_logs_created ON public.observability_logs(created_at DESC);

-- Performance: limit table growth via simple timestamp index
-- Application code will use LIMIT to prevent full-table scans
