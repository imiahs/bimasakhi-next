-- Phase 18: Data Versioning, AI Content, and Automation Schema

-- 1. Blog Post Versions
CREATE TABLE IF NOT EXISTS blog_post_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    author TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SEO Versions
CREATE TABLE IF NOT EXISTS seo_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seo_id UUID REFERENCES seo_overrides(id) ON DELETE CASCADE,
    route TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    og_title TEXT,
    og_description TEXT,
    keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tool Config Versions
CREATE TABLE IF NOT EXISTS tool_config_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES tool_configs(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SEO Analysis (AI SEO Optimizer)
CREATE TABLE IF NOT EXISTS seo_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_route TEXT NOT NULL,
    score INTEGER NOT NULL,
    suggestions JSONB NOT NULL DEFAULT '[]',
    generated_keywords JSONB NOT NULL DEFAULT '[]',
    internal_links JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Automation Rules Engine
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Assuming service role usage mostly, but enable for completeness)
ALTER TABLE blog_post_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
