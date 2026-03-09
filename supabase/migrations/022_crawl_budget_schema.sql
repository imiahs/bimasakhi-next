-- Migration: 022_crawl_budget_schema.sql

-- Part 1: Add crawl budget columns to page_index
ALTER TABLE public.page_index
ADD COLUMN IF NOT EXISTS crawl_priority VARCHAR(20) DEFAULT 'medium' CHECK (crawl_priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS crawl_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS internal_links_count INTEGER DEFAULT 0;

-- Ensure seo_growth_recommendations exists for Orphan detection
CREATE TABLE IF NOT EXISTS public.seo_growth_recommendations (
    id SERIAL PRIMARY KEY,
    page_index_id INTEGER REFERENCES public.page_index(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policies for seo_growth_recommendations
ALTER TABLE public.seo_growth_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to seo_growth_recommendations"
    ON public.seo_growth_recommendations
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update to seo_growth_recommendations"
    ON public.seo_growth_recommendations
    FOR ALL USING (auth.role() = 'authenticated');
