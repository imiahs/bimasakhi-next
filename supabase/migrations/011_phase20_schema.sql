-- Phase 20: AI Recruitment & Automation Engine Schema

-- 1. Lead Predictions
CREATE TABLE IF NOT EXISTS lead_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    conversion_probability DECIMAL(5,2) DEFAULT 0.00,
    recommended_action TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Content Recommendations
CREATE TABLE IF NOT EXISTS content_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_path TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- e.g., 'expand_topic', 'fix_dropoff'
    ai_suggestion TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CTA Recommendations
CREATE TABLE IF NOT EXISTS cta_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_type TEXT NOT NULL,
    condition_value TEXT NOT NULL,
    suggested_cta_component TEXT NOT NULL,
    reasoning TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Landing Page Analysis
CREATE TABLE IF NOT EXISTS landing_page_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path TEXT NOT NULL,
    bounce_rate DECIMAL(5,2),
    scroll_depth DECIMAL(5,2),
    cta_clicks INTEGER DEFAULT 0,
    ai_optimization_report TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Campaign Insights
CREATE TABLE IF NOT EXISTS campaign_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    medium TEXT,
    campaign TEXT,
    conversion_rate DECIMAL(5,2),
    ai_insight TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Conversion Forecasts
CREATE TABLE IF NOT EXISTS conversion_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forecast_date DATE NOT NULL,
    expected_leads INTEGER DEFAULT 0,
    expected_conversions INTEGER DEFAULT 0,
    ai_reasoning TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Growth Suggestions
CREATE TABLE IF NOT EXISTS growth_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_type TEXT NOT NULL, -- 'blog_topic', 'resource', 'calculator', 'feature'
    title TEXT NOT NULL,
    description TEXT,
    potential_impact TEXT, -- 'high', 'medium', 'low'
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
