-- Observability & Fallback Queues Schema
-- This schema represents the local fallback database structure

-- 1. General Error Logging & Monitoring
CREATE TABLE IF NOT EXISTS observability_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(50) NOT NULL, -- 'INFO', 'WARN', 'ERROR', 'CRITICAL'
    message TEXT NOT NULL,
    source VARCHAR(255) NOT NULL, -- e.g., 'zoho_sync', 'supabase_auth'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. API Request Auditing
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Lead Fallback Queue
-- If Zoho CRM is down, leads are stored here and retried later.
CREATE TABLE IF NOT EXISTS lead_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    source VARCHAR(100),
    synced_to_zoho BOOLEAN DEFAULT FALSE,
    synced_to_supabase BOOLEAN DEFAULT FALSE,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Background Sync Failures Dead-Letter Queue
CREATE TABLE IF NOT EXISTS sync_failures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service VARCHAR(100) NOT NULL, -- 'zoho' or 'supabase'
    payload JSONB NOT NULL,
    error TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. User Behavior & Funnel Event Stream
CREATE TABLE IF NOT EXISTS event_stream (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'calculator_used', 'resource_download', 'apply_submit'
    session_id VARCHAR(255),
    route_path VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
