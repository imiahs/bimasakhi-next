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

-- Insert a Mock Admin User for testing RBAC
-- Password Hash for 'bimasakhi2026' generated with bcrypt
INSERT INTO public.admin_users (email, name, password_hash, role, active)
VALUES (
    'admin@bimasakhi.com', 
    'Super Admin', 
    '$2a$10$w81.mIt4Zp0F46XN2L0MCOx0iM.rU/W.L.tO.FqYInT4hYg5hZ95a', -- 'bimasakhi2026'
    'super_admin', 
    true
)
ON CONFLICT (email) DO NOTHING;
