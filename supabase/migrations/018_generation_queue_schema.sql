-- 018_generation_queue_schema.sql

CREATE TABLE IF NOT EXISTS generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending', 
    progress INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES generation_queue(id) ON DELETE CASCADE,
    event_type TEXT, 
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_pages INTEGER DEFAULT 0,
    generation_time INTEGER DEFAULT 0,
    city_count INTEGER DEFAULT 0,
    locality_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
