-- Repair legacy admin_users installs so Phase 14 real user management
-- can use the schema expected by the current API handlers.

BEGIN;

ALTER TABLE public.admin_users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS assigned_cities UUID[] DEFAULT '{}'::UUID[];

UPDATE public.admin_users
SET is_active = COALESCE(is_active, active, TRUE)
WHERE is_active IS NULL;

UPDATE public.admin_users
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

UPDATE public.admin_users
SET assigned_cities = '{}'::UUID[]
WHERE assigned_cities IS NULL;

ALTER TABLE public.admin_users
    ALTER COLUMN is_active SET DEFAULT TRUE,
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN assigned_cities SET DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

COMMIT;