-- Migration 004: Leads Cache Schema
CREATE TABLE IF NOT EXISTS public.lead_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zoho_id TEXT UNIQUE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    city TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
