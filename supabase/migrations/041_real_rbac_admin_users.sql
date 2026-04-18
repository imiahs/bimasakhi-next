-- ============================================================
-- Migration: 041_real_rbac_admin_users.sql
-- Phase 0 Stage 4 — Fix C7: Real RBAC
-- Bible: Section 32 (Super Admin Panel), Section 20 (CEO Control)
-- Date: 2026-04-19
-- ============================================================

-- admin_users: Per-user authentication and role management.
-- Replaces single ADMIN_PASSWORD env var with proper per-user auth.
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,       -- bcryptjs hash (cost factor 12)
    role TEXT NOT NULL DEFAULT 'editor'
        CHECK (role IN ('super_admin', 'admin', 'editor', 'agent')),
    assigned_cities UUID[] DEFAULT '{}', -- for 'agent' role: which cities they manage
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- RLS: Only super_admin can manage admin_users (via service role key in API)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically — no policy needed for API routes.
-- Direct DB access from admin UI uses service role key.

-- ============================================================
-- Seed: Initial super_admin
-- Replace the email and password_hash below before running.
-- Generate hash: node -e "const b=require('bcryptjs'); b.hash('YOUR_STRONG_PASSWORD',12).then(console.log)"
-- ============================================================
-- INSERT INTO admin_users (email, name, password_hash, role)
-- VALUES (
--     'admin@bimasakhi.com',
--     'CEO',
--     '$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH',
--     'super_admin'
-- )
-- ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- INSTRUCTIONS FOR SETUP:
-- 1. Run this migration in Supabase SQL editor
-- 2. Generate bcrypt hash: node scripts/hash_password.js YOUR_PASSWORD
-- 3. Insert the super_admin row (uncomment + update above)
-- 4. Set env var: ADMIN_USERS_ENABLED=true in Vercel dashboard
-- 5. Remove ADMIN_PASSWORD env var after verifying login works
-- ============================================================
