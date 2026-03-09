-- 020_performance_cache_schema.sql

CREATE TABLE IF NOT EXISTS page_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_slug TEXT UNIQUE NOT NULL,
    cached_html TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_page_cache_slug ON page_cache(page_slug);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_slug TEXT NOT NULL,
    load_time_ms INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT false,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
