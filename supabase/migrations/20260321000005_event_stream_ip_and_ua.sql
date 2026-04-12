-- Add ip_address and user_agent to event_stream for robust telemetry

ALTER TABLE event_stream
ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT 'unknown';
