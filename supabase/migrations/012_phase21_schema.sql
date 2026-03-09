-- Phase 21: Visual Page Builder & Dynamic Content Schema

-- 1. Custom Pages Table (Tracks high level page attributes like slug, SEO, and versions)
CREATE TABLE IF NOT EXISTS custom_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
    is_campaign_page BOOLEAN DEFAULT false,
    author UUID REFERENCES admin_users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Page Blocks Table (Stores the individual structural elements assigned to a page)
CREATE TABLE IF NOT EXISTS page_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES custom_pages(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL, -- e.g., 'Hero', 'Content', 'Benefits', 'Testimonials', 'CTA', 'FAQ', 'Calculator', 'Download'
    block_order INTEGER NOT NULL DEFAULT 0,
    block_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store strings, images, component-specific config
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Page Versions Table (Snapshots for Rollback capabilities)
CREATE TABLE IF NOT EXISTS page_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES custom_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL, -- Full dump of the page title, SEO, and all block_data simultaneously
    saved_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Page Metrics Table (Direct integration measuring Landing Analytics against particular Custom Pages)
CREATE TABLE IF NOT EXISTS page_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES custom_pages(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    cta_clicks INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    average_scroll_depth DECIMAL(5,2) DEFAULT 0.00,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure version number uniqueness per page
ALTER TABLE page_versions ADD CONSTRAINT unique_version_per_page UNIQUE (page_id, version_number);
