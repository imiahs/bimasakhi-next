-- Migration 001: Admin Auth Schema
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'editor', -- 'super_admin', 'editor', 'viewer'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin users should be created via the secure setup script:
--   node scripts/setup-admin.js
-- This script reads ADMIN_EMAIL and ADMIN_PASSWORD_PLAIN from environment variables,
-- hashes the password with bcrypt, and inserts the admin user securely.
-- NEVER hardcode credentials in migration files.
