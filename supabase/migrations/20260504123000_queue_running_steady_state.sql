-- Migration: make queue processing the natural steady-state default

ALTER TABLE public.system_control_config
    ALTER COLUMN queue_paused SET DEFAULT FALSE;

UPDATE public.system_control_config
SET
    queue_paused = FALSE,
    updated_at = NOW()
WHERE singleton_key = TRUE
  AND queue_paused IS DISTINCT FROM FALSE;