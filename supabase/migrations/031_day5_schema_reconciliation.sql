-- 031_day5_schema_reconciliation.sql
-- Day 5: additive reconciliation for runtime schema drift.
-- This migration is intentionally non-destructive. It closes missing
-- core runtime tables/columns without rewriting historical migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads: runtime code references these columns in AI/routing/follow-up paths.
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_id UUID,
    ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS interest_level TEXT,
    ADD COLUMN IF NOT EXISTS marketing_source TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON public.leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON public.leads(is_converted);

-- failed_leads: retry job expects retry_count and retries by created_at order.
ALTER TABLE public.failed_leads
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_failed_leads_retry_count ON public.failed_leads(retry_count);
CREATE INDEX IF NOT EXISTS idx_failed_leads_created_at ON public.failed_leads(created_at);

-- api_requests: request guardrails logger writes these fields.
ALTER TABLE public.api_requests
    ADD COLUMN IF NOT EXISTS endpoint TEXT,
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON public.api_requests(created_at);

-- system_runtime_errors: multiple loggers/admin APIs expect these columns.
ALTER TABLE public.system_runtime_errors
    ADD COLUMN IF NOT EXISTS component TEXT,
    ADD COLUMN IF NOT EXISTS error_type TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_system_runtime_errors_resolved_created
    ON public.system_runtime_errors(resolved, created_at DESC);

-- worker_health: used by queue/follow-up/AI workers and observability code.
CREATE TABLE IF NOT EXISTS public.worker_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    status TEXT DEFAULT 'unknown',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    last_run TIMESTAMP WITH TIME ZONE,
    jobs_processed INTEGER DEFAULT 0,
    failures INTEGER DEFAULT 0,
    message TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    memory_usage JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_health_worker_name
    ON public.worker_health(worker_name);

-- AI decision audit trail: used by scoring, routing, follow-up, and growth admin.
CREATE TABLE IF NOT EXISTS public.ai_decision_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL,
    decision_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_lead_created
    ON public.ai_decision_logs(lead_id, created_at DESC);

-- Routing log table: current router writes here directly.
CREATE TABLE IF NOT EXISTS public.lead_routing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID,
    routing_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_routing_logs_lead_created
    ON public.lead_routing_logs(lead_id, created_at DESC);

-- Communication templates: follow-up worker depends on at least one active template.
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_templates_active
    ON public.communication_templates(is_active);
