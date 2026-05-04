-- Migration: C32 control-plane truth unification
-- Canonical runtime control keys now live only in system_control_config.

ALTER TABLE public.system_control_config
    ADD COLUMN IF NOT EXISTS safe_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pagegen_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS bulk_generation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO public.system_control_config (
    singleton_key,
    safe_mode,
    pagegen_enabled,
    bulk_generation_enabled
)
VALUES (TRUE, FALSE, TRUE, TRUE)
ON CONFLICT (singleton_key) DO NOTHING;

WITH legacy_flags AS (
    SELECT
        COALESCE(BOOL_OR(CASE WHEN key = 'safe_mode' THEN value END), FALSE) AS safe_mode,
        COALESCE(BOOL_OR(CASE WHEN key = 'pagegen_enabled' THEN value END), TRUE) AS pagegen_enabled,
        COALESCE(BOOL_OR(CASE WHEN key = 'bulk_generation_enabled' THEN value END), TRUE) AS bulk_generation_enabled
    FROM public.feature_flags
)
UPDATE public.system_control_config AS cfg
SET
    safe_mode = legacy_flags.safe_mode,
    pagegen_enabled = legacy_flags.pagegen_enabled,
    bulk_generation_enabled = legacy_flags.bulk_generation_enabled,
    updated_at = NOW()
FROM legacy_flags
WHERE cfg.singleton_key = TRUE;

DELETE FROM public.feature_flags
WHERE key IN ('safe_mode', 'pagegen_enabled', 'bulk_generation_enabled');

ALTER TABLE public.feature_flags
    DROP CONSTRAINT IF EXISTS feature_flags_no_control_plane_keys;

ALTER TABLE public.feature_flags
    ADD CONSTRAINT feature_flags_no_control_plane_keys
    CHECK (key NOT IN ('safe_mode', 'pagegen_enabled', 'bulk_generation_enabled'));