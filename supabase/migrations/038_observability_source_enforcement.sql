-- STABILIZATION: Observability Source Enforcement
-- Fixes empty source values and adds DB-level guard
-- Date: 2026-04-20
-- Bible Reference: Rule 9 (Observability), Stabilization Phase

-- Step 1: Fix any existing rows with empty source
UPDATE observability_logs 
SET source = 'legacy_untagged' 
WHERE source IS NULL OR source = '' OR TRIM(source) = '';

-- Step 2: Add NOT NULL constraint with default (idempotent)
ALTER TABLE observability_logs 
ALTER COLUMN source SET NOT NULL;

ALTER TABLE observability_logs 
ALTER COLUMN source SET DEFAULT 'system';

-- Step 3: Add CHECK constraint to prevent empty strings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_observability_source_not_empty'
    ) THEN
        ALTER TABLE observability_logs 
        ADD CONSTRAINT chk_observability_source_not_empty 
        CHECK (TRIM(source) <> '');
    END IF;
END $$;

-- Step 4: Create index on source for faster grouping/filtering
CREATE INDEX IF NOT EXISTS idx_observability_logs_source 
ON observability_logs(source);

-- Step 5: Create composite index for health monitoring queries
CREATE INDEX IF NOT EXISTS idx_observability_logs_level_created 
ON observability_logs(level, created_at DESC);
