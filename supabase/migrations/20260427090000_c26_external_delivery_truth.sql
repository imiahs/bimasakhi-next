-- Migration: C26 delivery-level truth for external dispatches (QStash)

CREATE TABLE IF NOT EXISTS public.external_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'qstash',
    provider_message_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'scheduled', 'active', 'delivered', 'failed', 'cancelled', 'unknown')),
    source TEXT NOT NULL DEFAULT 'unknown',
    event_name TEXT,
    event_store_id UUID REFERENCES public.event_store(id) ON DELETE SET NULL,
    generation_queue_id UUID REFERENCES public.generation_queue(id) ON DELETE SET NULL,
    target_url TEXT,
    target_path TEXT,
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider_response JSONB,
    provider_message JSONB,
    latest_event JSONB,
    attempt_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    provider_retry_count INTEGER NOT NULL DEFAULT 0,
    sync_count INTEGER NOT NULL DEFAULT 0,
    error_payload JSONB,
    sync_error TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_provider_event_at TIMESTAMPTZ,
    last_provider_event_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT external_delivery_logs_provider_message_id_key UNIQUE (provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_status_published_at
    ON public.external_delivery_logs(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_event_store_id
    ON public.external_delivery_logs(event_store_id)
    WHERE event_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_generation_queue_id
    ON public.external_delivery_logs(generation_queue_id)
    WHERE generation_queue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_last_sync_at
    ON public.external_delivery_logs(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_delivered_at
    ON public.external_delivery_logs(delivered_at)
    WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_delivery_logs_failed_at
    ON public.external_delivery_logs(failed_at)
    WHERE failed_at IS NOT NULL;