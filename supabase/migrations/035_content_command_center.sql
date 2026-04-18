-- Phase 2: Content Command Center — content_drafts table
-- Migration: 035_content_command_center.sql
-- Purpose: Store AI-generated page drafts for human review before publishing

CREATE TABLE IF NOT EXISTS content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_queue_id UUID REFERENCES generation_queue(id),
    page_index_id UUID REFERENCES page_index(id),
    city_id UUID REFERENCES cities(id),
    locality_id UUID REFERENCES localities(id),
    slug TEXT NOT NULL,
    page_title TEXT,
    meta_title TEXT,
    meta_description TEXT,
    hero_headline TEXT,
    body_content TEXT,
    faq_data JSONB,
    cta_text TEXT,
    word_count INTEGER DEFAULT 0,
    quality_score NUMERIC(3,1),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','rejected','published','archived')),
    review_notes TEXT,
    reviewer TEXT,
    reviewed_at TIMESTAMPTZ,
    ai_model TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_content_drafts_city ON content_drafts(city_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_slug ON content_drafts(slug);
CREATE INDEX IF NOT EXISTS idx_content_drafts_created ON content_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_drafts_page_index ON content_drafts(page_index_id);

-- Enable RLS
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on content_drafts"
    ON content_drafts
    FOR ALL
    USING (true)
    WITH CHECK (true);
