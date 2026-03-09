-- 015_keywords_schema.sql

CREATE TABLE IF NOT EXISTS keyword_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_keyword TEXT NOT NULL,
    variation TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
