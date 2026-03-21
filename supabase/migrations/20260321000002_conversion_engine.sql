-- Migration: Conversion Engine & Revenue Tracking
-- Date: 2026-03-21

-- TASK 1: LEAD CONVERSION TRACKING
-- TASK 3: REVENUE TRACKING
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS conversion_value INT DEFAULT 0;

-- (Optional) Index for fast metric calculation bounds
CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON leads(is_converted) WHERE is_converted = true;
CREATE INDEX IF NOT EXISTS idx_leads_converted_at ON leads(converted_at);
