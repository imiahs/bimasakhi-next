-- 019_reliability_engine_schema.sql

CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT UNIQUE NOT NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT,
    component TEXT,
    message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jobs_processed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    retry_attempts INTEGER DEFAULT 0,
    worker_restarts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_index_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indexed_pages INTEGER DEFAULT 0,
    excluded_pages INTEGER DEFAULT 0,
    crawl_errors INTEGER DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
