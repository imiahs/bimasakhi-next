-- Phase 11: Database Safety & Optimization
-- Execute this script in your Supabase SQL Editor

-- ==========================================
-- 1. Index Optimizations
-- ==========================================

-- Ensure contact_inquiries exists before indexing
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Speeds up route_path grouping and time-based filtering in Analytics/AI engines
CREATE INDEX IF NOT EXISTS idx_event_stream_path_time ON event_stream(route_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_stream_type ON event_stream(event_type);
CREATE INDEX IF NOT EXISTS idx_event_stream_session ON event_stream(session_id);

-- Speeds up CRM ID and Phone number duplicate checks
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_mobile_email ON contact_inquiries(mobile, email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_metrics_target_path ON content_metrics(target_path);

-- Speeds up queue processing
CREATE INDEX IF NOT EXISTS idx_lead_queue_sync_status ON lead_queue(synced_to_zoho, synced_to_supabase) WHERE synced_to_zoho = FALSE OR synced_to_supabase = FALSE;

-- ==========================================
-- 2. TTL (Time-To-Live) Automated Cleanup
-- ==========================================

-- Enable pg_cron extension (Usually enabled by default on Supabase Pro/Free)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'purge_stale_telemetry_logs',
  '0 3 * * *',
  $$
    -- Delete observability logs older than 30 days
    DELETE FROM observability_logs WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete granular API requests logging older than 14 days
    DELETE FROM api_requests WHERE created_at < NOW() - INTERVAL '14 days';
    
    -- Delete granular web telemetry (event stream) older than 90 days to save DB space
    -- We rely on aggregated metrics (content_metrics, traffic_sources) for long term data
    DELETE FROM event_stream WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Purge dead-letter sync failures after 30 days if retries exceeded
    DELETE FROM sync_failures WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clear out securely processed webhook queue payload traces
    DELETE FROM lead_queue WHERE created_at < NOW() - INTERVAL '14 days' AND synced_to_zoho = TRUE AND synced_to_supabase = TRUE;
  $$
);
