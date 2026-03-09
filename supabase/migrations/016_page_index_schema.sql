-- 016_page_index_schema.sql

CREATE TABLE IF NOT EXISTS page_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_slug TEXT UNIQUE NOT NULL,
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    locality_id UUID REFERENCES localities(id) ON DELETE CASCADE,
    keyword_variation_id UUID REFERENCES keyword_variations(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending_index', -- 'active', 'disabled', 'noindex', 'pending_index'
    crawl_priority TEXT DEFAULT 'locality_page', -- 'city_page', 'locality_page', 'keyword_page'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_index_slug ON page_index(page_slug);

CREATE TABLE IF NOT EXISTS location_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_level TEXT NOT NULL, 
    page_index_id UUID REFERENCES page_index(id) ON DELETE CASCADE,
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    locality_id UUID REFERENCES localities(id) ON DELETE CASCADE,
    keyword_variation TEXT,
    hero_headline TEXT,
    local_opportunity_description TEXT,
    faq_data JSONB DEFAULT '[]'::jsonb,
    cta_text TEXT,
    meta_title TEXT,
    meta_description TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_location_content UNIQUE (page_index_id)
);

CREATE INDEX IF NOT EXISTS idx_location_content_page_index ON location_content(page_index_id);

CREATE TABLE IF NOT EXISTS location_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    locality_id UUID REFERENCES localities(id) ON DELETE CASCADE,
    insight_type TEXT, 
    ai_suggestion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_growth_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_type TEXT, 
    target_data JSONB DEFAULT '{}'::jsonb,
    ai_rationale TEXT,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
