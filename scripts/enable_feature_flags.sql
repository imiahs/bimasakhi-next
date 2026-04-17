-- PHASE 4: Enable feature flags for unified pipeline
-- Run via Supabase SQL Editor or admin API

-- Enable AI scoring (heuristic, no cost impact)
-- Enable followup (requires FOLLOWUP_WEBHOOK_URL to actually send)
-- Keep queue_paused=true (controls pagegen only now)
-- crm_auto_routing already true

UPDATE system_control_config
SET
    ai_enabled = true,
    followup_enabled = true,
    updated_at = NOW()
WHERE singleton_key = true;

-- Verify
SELECT * FROM system_control_config WHERE singleton_key = true;
