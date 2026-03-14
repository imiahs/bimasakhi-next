-- Phase 20: System Alerts & Incident Detection Schema

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'security', 'performance', 'database', 'worker'
    severity VARCHAR(20) NOT NULL,   -- 'high', 'medium', 'low'
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Optimized index for dashboard pulling "active" severe alerts quickly
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(severity, created_at DESC) WHERE resolved = FALSE;
