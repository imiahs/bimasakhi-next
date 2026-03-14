-- Phase 16: System Runtime Error Monitoring Schema

CREATE TABLE IF NOT EXISTS system_runtime_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index unresolved errors for fast dashboard access
CREATE INDEX IF NOT EXISTS idx_system_runtime_errors_unresolved ON system_runtime_errors(created_at DESC) WHERE resolved = FALSE;
