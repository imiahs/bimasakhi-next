-- SHOS operator control plane: reversible admin actions and operator state tracking

CREATE TABLE IF NOT EXISTS public.system_control_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_key TEXT NOT NULL,
    operation TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT NOT NULL DEFAULT 'user'
        CHECK (actor_type IN ('user', 'system')),
    reason TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    requested_value JSONB,
    previous_value JSONB,
    result_value JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    reversible BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'applied'
        CHECK (status IN ('applied', 'scheduled', 'reverted', 'failed', 'cancelled')),
    auto_revert_at TIMESTAMPTZ,
    reverted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_control_actions_category_created
    ON public.system_control_actions(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_control_actions_target
    ON public.system_control_actions(target_type, target_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_control_actions_auto_revert
    ON public.system_control_actions(auto_revert_at)
    WHERE auto_revert_at IS NOT NULL AND status = 'applied' AND reverted_at IS NULL;

ALTER TABLE public.job_dead_letters
    ADD COLUMN IF NOT EXISTS operator_status TEXT DEFAULT 'pending'
        CHECK (operator_status IN ('pending', 'retried', 'discarded', 'resolved')),
    ADD COLUMN IF NOT EXISTS operator_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by TEXT,
    ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_retried_by TEXT;

CREATE INDEX IF NOT EXISTS idx_job_dead_letters_operator_status
    ON public.job_dead_letters(operator_status, failed_at DESC NULLS LAST, created_at DESC);

ALTER TABLE public.generation_queue
    ADD COLUMN IF NOT EXISTS operator_status TEXT DEFAULT 'active'
        CHECK (operator_status IN ('active', 'cleared', 'cancelled', 'resolved')),
    ADD COLUMN IF NOT EXISTS operator_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by TEXT,
    ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_retried_by TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_generation_queue_operator_status
    ON public.generation_queue(operator_status, status, created_at DESC);

ALTER TABLE public.external_delivery_logs
    ADD COLUMN IF NOT EXISTS operator_status TEXT DEFAULT 'active'
        CHECK (operator_status IN ('active', 'terminal', 'resolved')),
    ADD COLUMN IF NOT EXISTS operator_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by TEXT;

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_operator_status
    ON public.external_delivery_logs(operator_status, status, published_at DESC);

ALTER TABLE public.system_errors
    ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by TEXT;

CREATE INDEX IF NOT EXISTS idx_system_errors_resolved
    ON public.system_errors(resolved, created_at DESC);