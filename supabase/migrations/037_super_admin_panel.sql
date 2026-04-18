-- Migration: 037_super_admin_panel.sql
-- Phase 14: Super Admin Panel — Feature Flags + Workflow Config
-- Bible: Section 32, Rule 19 Priority A

-- ============================================================
-- 1. Feature Flags Table (key-value toggle system)
-- Replaces limited singleton system_control_config for feature toggles
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    value BOOLEAN DEFAULT TRUE,
    restricted BOOLEAN DEFAULT FALSE,
    last_changed_by TEXT,
    last_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);

-- Seed feature flags per bible Section 32
INSERT INTO feature_flags (key, label, description, category, value, restricted) VALUES
    ('pagegen_enabled', 'Page Generation (AI)', 'Controls whether new pages can be generated via AI', 'generation', TRUE, FALSE),
    ('bulk_generation_enabled', 'Bulk Job Planner', 'Controls whether bulk generation jobs can be created', 'generation', TRUE, TRUE),
    ('auto_publish_enabled', 'Auto-Publish Approved Pages', 'Auto-publish pages that pass quality threshold', 'publishing', FALSE, TRUE),
    ('sitemap_drip_enabled', 'Sitemap Drip (50/day cap)', 'Drip new URLs into sitemap at controlled rate', 'publishing', TRUE, FALSE),
    ('lead_capture_enabled', 'Lead Form Capture', 'Enable lead capture forms on public pages', 'leads', TRUE, FALSE),
    ('download_gate_enabled', 'Download Lead Gate', 'Require lead info before resource download', 'leads', TRUE, FALSE),
    ('whatsapp_alerts_enabled', 'WhatsApp Lead Alerts', 'Send WhatsApp alerts for new leads', 'automation', TRUE, FALSE),
    ('email_sequences_enabled', 'Zoho Email Drip Sequences', 'Enable automated email sequences via Zoho', 'automation', FALSE, TRUE),
    ('lead_scoring_enabled', 'Automatic Lead Scoring', 'Auto-score leads based on behavior', 'leads', TRUE, FALSE),
    ('bilingual_generation_enabled', 'Hindi Content Generation', 'Generate bilingual Hindi content', 'generation', FALSE, FALSE),
    ('social_auto_draft_enabled', 'Social Post Auto-Draft', 'Auto-generate social media post drafts', 'automation', FALSE, TRUE),
    ('agent_personalization_enabled', 'Agent Card on Pages', 'Show agent personalization cards on pages', 'publishing', TRUE, FALSE),
    ('gsc_sync_enabled', 'GSC Performance Data Sync', 'Sync Google Search Console performance data', 'system', FALSE, FALSE),
    ('ai_pattern_analyzer_enabled', 'Bi-weekly AI Insights Job', 'Run AI pattern analysis on content performance', 'system', FALSE, TRUE),
    ('safe_mode', 'SAFE MODE (Emergency Pause)', 'Halts ALL automated operations. Read-only mode.', 'system', FALSE, TRUE)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Workflow Config Table (thresholds, caps, rules)
-- Stores numeric/text workflow configuration values
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'number',
    value_number NUMERIC,
    value_text TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    last_changed_by TEXT,
    last_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_config_key ON workflow_config(key);
CREATE INDEX IF NOT EXISTS idx_workflow_config_category ON workflow_config(category);

-- Seed workflow config per bible Section 32 Layer 3
INSERT INTO workflow_config (key, label, description, category, value_type, value_number, value_text, min_value, max_value) VALUES
    -- Content Quality Thresholds
    ('min_word_count_reject', 'Auto-reject word count', 'Auto-reject if word count below this', 'quality', 'number', 300, NULL, 100, 1000),
    ('min_word_count_flag', 'Flag for review word count', 'Flag for review if word count below this', 'quality', 'number', 400, NULL, 100, 1000),
    ('auto_approve_quality_score', 'Auto-approve quality score', 'Auto-approve if quality score above this (if auto-approve ON)', 'quality', 'number', 8.0, NULL, 1, 10),
    ('manual_review_quality_score', 'Manual review quality score', 'Always manual review if quality score below this', 'quality', 'number', 6.0, NULL, 1, 10),
    -- Publishing Rules
    ('daily_publish_cap', 'Daily publish cap (all types)', 'Maximum pages published per day across all types', 'publishing', 'number', 50, NULL, 1, 500),
    ('daily_publish_locality', 'Daily locality page cap', 'Maximum locality pages published per day', 'publishing', 'number', 20, NULL, 1, 200),
    ('daily_publish_micro', 'Daily micro page cap', 'Maximum micro pages published per day', 'publishing', 'number', 30, NULL, 1, 200),
    ('sitemap_drip_rate', 'Sitemap drip rate', 'Max new URLs added to sitemap per day', 'publishing', 'number', 50, NULL, 1, 500),
    -- Generation Rules
    ('max_queue_items_per_job', 'Max queue items per bulk job', 'Maximum items allowed per bulk generation job', 'generation', 'number', 500, NULL, 10, 5000),
    ('generation_rate_per_hour', 'Generation rate per hour', 'Maximum items generated per hour', 'generation', 'number', 50, NULL, 5, 500),
    ('max_retries_per_job', 'Max retries per failed job', 'Maximum retry attempts for failed generation jobs', 'generation', 'number', 3, NULL, 1, 10),
    -- Lead Rules
    ('hot_lead_score', 'Hot lead score threshold', 'Score threshold for hot lead Cliq alert', 'leads', 'number', 100, NULL, 10, 500),
    ('warm_lead_score', 'Warm lead score threshold', 'Score threshold for warm lead WhatsApp alert', 'leads', 'number', 70, NULL, 10, 500),
    ('agent_response_sla_minutes', 'Agent response SLA (minutes)', 'SLA for agent response to hot lead', 'leads', 'number', 60, NULL, 5, 1440),
    -- AI Rules
    ('ai_model_primary', 'Primary AI model', 'Gemini model used for content generation', 'ai', 'text', NULL, 'gemini-2.0-flash', NULL, NULL),
    ('ai_model_fallback', 'Fallback AI model', 'Fallback model when primary fails', 'ai', 'text', NULL, 'gemini-2.5-flash-lite', NULL, NULL),
    ('ai_max_tokens', 'Max tokens per generation', 'Maximum tokens per AI generation call', 'ai', 'number', 2048, NULL, 512, 8192),
    -- Cost Controls
    ('ai_daily_cost_cap_usd', 'AI daily cost cap (USD)', 'Maximum daily AI spend in USD', 'cost', 'number', 5.00, NULL, 0.50, 100),
    ('ai_monthly_cost_cap_usd', 'AI monthly cost cap (USD)', 'Maximum monthly AI spend in USD', 'cost', 'number', 100.00, NULL, 10, 1000)
ON CONFLICT (key) DO NOTHING;
