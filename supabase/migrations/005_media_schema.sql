-- Migration 005: Advanced Media Pipeline Schema
CREATE TABLE IF NOT EXISTS public.media_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    format TEXT,
    uploaded_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
