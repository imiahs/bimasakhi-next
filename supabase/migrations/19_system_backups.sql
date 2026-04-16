-- Phase 19: Automated Backup Strategy Schema

CREATE TABLE IF NOT EXISTS system_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL, -- 'daily_export' or 'weekly_snapshot'
    status VARCHAR(50) NOT NULL, -- 'success', 'failed'
    file_path VARCHAR(500),
    tables_backed_up JSONB,
    file_size_bytes BIGINT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index to quickly query successful backups by type
CREATE INDEX IF NOT EXISTS idx_system_backups_status ON system_backups(status, backup_type, created_at DESC);
