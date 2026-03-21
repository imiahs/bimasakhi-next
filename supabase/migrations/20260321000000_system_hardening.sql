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

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
