-- Migration 038: External System Governance (Phase 21)
-- Bible Reference: Section 39, Rules 20-24
-- Creates: sla_snapshots, alert_deliveries, vendor_contracts
-- Enhances: system_control_config (maintenance mode)

-- ═══════════════════════════════════════════════════════════
-- TABLE 1: sla_snapshots — Per-vendor SLA monitoring
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sla_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    service TEXT NOT NULL,
    metric TEXT NOT NULL,
    
    value NUMERIC NOT NULL,
    threshold_warning NUMERIC,
    threshold_critical NUMERIC,
    status TEXT DEFAULT 'normal'
        CHECK (status IN ('normal','warning','critical')),
    
    sample_size INTEGER,
    window_minutes INTEGER DEFAULT 5,
    
    measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_service_time ON sla_snapshots(service, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_status ON sla_snapshots(status) WHERE status != 'normal';

-- ═══════════════════════════════════════════════════════════
-- TABLE 2: alert_deliveries — Track every alert notification
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alert_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2','P3')),
    message TEXT NOT NULL,
    context JSONB,
    
    channels_attempted TEXT[] NOT NULL DEFAULT '{}',
    channels_delivered TEXT[] DEFAULT '{}',
    delivery_status TEXT DEFAULT 'pending'
        CHECK (delivery_status IN ('pending','partial','delivered','failed')),
    
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    
    escalation_level INTEGER DEFAULT 0,
    next_escalation_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_status ON alert_deliveries(delivery_status) WHERE delivery_status != 'delivered';
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_severity ON alert_deliveries(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_ack ON alert_deliveries(acknowledged) WHERE acknowledged = false;

-- ═══════════════════════════════════════════════════════════
-- TABLE 3: vendor_contracts — Formal vendor config/thresholds
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vendor_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    vendor TEXT NOT NULL UNIQUE,
    purpose TEXT,
    criticality TEXT NOT NULL CHECK (criticality IN ('critical','important','nice_to_have')),
    
    -- Circuit breaker config
    cb_failure_threshold INTEGER DEFAULT 5,
    cb_reset_timeout_seconds INTEGER DEFAULT 30,
    cb_window_minutes INTEGER DEFAULT 2,
    
    -- SLA thresholds
    sla_response_warning_ms INTEGER,
    sla_response_critical_ms INTEGER,
    sla_error_rate_warning NUMERIC,
    sla_error_rate_critical NUMERIC,
    
    -- Retry config
    retry_max_attempts INTEGER DEFAULT 3,
    retry_base_delay_ms INTEGER DEFAULT 1000,
    retry_backoff_multiplier NUMERIC DEFAULT 2.0,
    
    -- Status
    circuit_state TEXT DEFAULT 'closed'
        CHECK (circuit_state IN ('closed','open','half_open')),
    circuit_opened_at TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    health_status TEXT DEFAULT 'unknown'
        CHECK (health_status IN ('healthy','degraded','down','unknown')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON vendor_contracts(vendor);

-- ═══════════════════════════════════════════════════════════
-- SEED: Vendor contracts per bible Section 39
-- ═══════════════════════════════════════════════════════════
INSERT INTO vendor_contracts (vendor, purpose, criticality, cb_failure_threshold, cb_reset_timeout_seconds, cb_window_minutes, sla_response_warning_ms, sla_response_critical_ms, sla_error_rate_warning, sla_error_rate_critical, retry_max_attempts, retry_base_delay_ms, retry_backoff_multiplier) VALUES
('supabase', 'Database + Auth + Storage', 'critical', 5, 30, 2, 100, 500, 0.01, 0.05, 2, 1000, 2.0),
('vercel', 'Hosting + Serverless Functions + Edge', 'critical', 5, 30, 2, 500, 2000, 0.01, 0.05, 2, 1000, 2.0),
('qstash', 'Async Job Queue + Scheduling', 'critical', 5, 30, 2, 5000, 30000, 0.01, 0.05, 3, 1000, 2.0),
('zoho', 'CRM + Cliq Alerts + Email', 'important', 5, 60, 5, 2000, 5000, 0.05, 0.10, 3, 2000, 2.0),
('gemini', 'AI Content Generation', 'important', 3, 60, 5, 10000, 30000, 0.05, 0.10, 2, 2000, 3.0)
ON CONFLICT (vendor) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- ALTER: Add maintenance mode to system_control_config
-- ═══════════════════════════════════════════════════════════
-- Update valid modes: add 'maintenance' alongside existing normal/degraded/emergency
-- Note: system_mode column already exists from earlier migration, we just ensure 
-- the value constraint is flexible (TEXT column, no CHECK constraint on it)
