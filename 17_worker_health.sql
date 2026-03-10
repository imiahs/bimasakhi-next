-- Phase 17: Worker Health Monitoring Schema

CREATE TABLE IF NOT EXISTS worker_health (
    worker_name VARCHAR(100) PRIMARY KEY,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    jobs_processed INTEGER DEFAULT 0,
    failures INTEGER DEFAULT 0,
    memory_usage JSONB,
    status VARCHAR(50) DEFAULT 'online'
);
