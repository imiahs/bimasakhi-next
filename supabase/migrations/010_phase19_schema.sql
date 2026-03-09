-- Phase 19: Lead Intelligence & Growth Engine Schema

-- 1. Lead Scores
CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    score_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);

-- 2. Lead Journeys
CREATE TABLE IF NOT EXISTS lead_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    steps JSONB DEFAULT '[]'::jsonb,
    conversion_point TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_journeys_lead_id ON lead_journeys(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_journeys_session_id ON lead_journeys(session_id);

-- 3. Lead Insights
CREATE TABLE IF NOT EXISTS lead_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CTA Rules
CREATE TABLE IF NOT EXISTS cta_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_type TEXT NOT NULL,
    condition_value TEXT,
    cta_component TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Content Metrics
CREATE TABLE IF NOT EXISTS content_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_path TEXT UNIQUE NOT NULL,
    views INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_metrics_target_path ON content_metrics(target_path);

-- 6. Traffic Sources
CREATE TABLE IF NOT EXISTS traffic_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    medium TEXT,
    campaign TEXT,
    visits INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source, medium, campaign)
);

-- 7. Growth Reports
CREATE TABLE IF NOT EXISTS growth_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE DEFAULT CURRENT_DATE,
    top_source TEXT,
    top_content TEXT,
    worst_content TEXT,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
