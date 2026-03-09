-- 017_content_quality_schema.sql

CREATE TABLE IF NOT EXISTS content_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_index_id UUID REFERENCES page_index(id) ON DELETE CASCADE UNIQUE,
    content_hash TEXT NOT NULL,
    similarity_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_quality_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_index_id UUID REFERENCES page_index(id) ON DELETE CASCADE UNIQUE,
    readability_score INTEGER DEFAULT 0,
    uniqueness_score INTEGER DEFAULT 0,
    seo_content_score INTEGER DEFAULT 0,
    ai_confidence_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_index_id UUID REFERENCES page_index(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_quality_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_index_id UUID REFERENCES page_index(id) ON DELETE CASCADE UNIQUE,
    traffic_score INTEGER DEFAULT 0,
    conversion_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    seo_score INTEGER DEFAULT 0,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
