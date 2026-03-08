-- Migration 007: SEO Overrides Schema
CREATE TABLE IF NOT EXISTS public.seo_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_path TEXT UNIQUE NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    robots_setting TEXT DEFAULT 'index, follow',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
