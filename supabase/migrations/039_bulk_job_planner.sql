-- Migration 039: Bulk Job Planner (Phase 4)
-- Bible Reference: Section 10-12, Phase 4
-- Creates: bulk_generation_jobs table

-- ═══════════════════════════════════════════════════════════
-- TABLE: bulk_generation_jobs — Plan and track bulk page generation
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bulk_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Targeting
    intent_type TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'locality',
    city_ids UUID[] DEFAULT '{}',
    locality_ids UUID[] DEFAULT '{}',
    pincode_list TEXT[] DEFAULT '{}',
    
    -- Keyword Config
    base_keyword TEXT NOT NULL,
    keyword_variations TEXT[] DEFAULT '{}',
    
    -- Content Config
    content_type TEXT NOT NULL DEFAULT 'local_service',
    auto_approve_threshold NUMERIC(3,1) DEFAULT 8.0,
    require_review_below NUMERIC(3,1) DEFAULT 6.0,
    
    -- Rate Control
    daily_publish_limit INTEGER DEFAULT 20,
    generation_per_hour_cap INTEGER DEFAULT 50,
    
    -- Progress
    total_pages INTEGER DEFAULT 0,
    generated_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    published_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    
    -- State
    status TEXT DEFAULT 'planned' 
        CHECK (status IN ('planned','running','paused','completed','failed','cancelled')),
    started_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status ON bulk_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_created ON bulk_generation_jobs(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- ALTER: Add bulk_job_id to content_drafts for tracking
-- ═══════════════════════════════════════════════════════════
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS bulk_job_id UUID REFERENCES bulk_generation_jobs(id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_bulk_job ON content_drafts(bulk_job_id) WHERE bulk_job_id IS NOT NULL;
