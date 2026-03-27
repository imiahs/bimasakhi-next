CREATE TABLE IF NOT EXISTS failed_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    mobile TEXT,
    email TEXT,
    city TEXT,
    payload JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observability_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT,
    message TEXT,
    source TEXT DEFAULT 'system',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
