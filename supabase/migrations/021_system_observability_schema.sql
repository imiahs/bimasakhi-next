-- Migration: 021_system_observability_schema.sql

-- Part 1: System Metrics Snapshot
-- Lightweight 1-row table for dashboards to read
CREATE TABLE IF NOT EXISTS public.system_metrics_snapshot (
    id SERIAL PRIMARY KEY,
    jobs_processed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    redis_latency_ms INTEGER DEFAULT 0,
    supabase_latency_ms INTEGER DEFAULT 0,
    queue_depth INTEGER DEFAULT 0,
    worker_uptime INTEGER DEFAULT 0,
    error_rate INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure there is a single row
INSERT INTO public.system_metrics_snapshot (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Policies for system_metrics_snapshot
ALTER TABLE public.system_metrics_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to system_metrics_snapshot"
    ON public.system_metrics_snapshot
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update to system_metrics_snapshot"
    ON public.system_metrics_snapshot
    FOR ALL USING (auth.role() = 'authenticated');

-- Part 2: Search Index Metrics
-- Simple table for the /admin/seo/index-health dashboard
CREATE TABLE IF NOT EXISTS public.search_index_metrics (
    id SERIAL PRIMARY KEY,
    indexed_pages INTEGER DEFAULT 0,
    pending_pages INTEGER DEFAULT 0,
    noindex_pages INTEGER DEFAULT 0,
    crawl_errors INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure there is a single row
INSERT INTO public.search_index_metrics (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Policies for search_index_metrics
ALTER TABLE public.search_index_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to search_index_metrics"
    ON public.search_index_metrics
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update to search_index_metrics"
    ON public.search_index_metrics
    FOR ALL USING (auth.role() = 'authenticated');
