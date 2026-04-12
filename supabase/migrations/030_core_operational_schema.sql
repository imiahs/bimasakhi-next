-- 030_core_operational_schema.sql
-- Day 5: Reconciling core operational schema as the source of truth

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Core Leads Table (Canonical Record)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    locality TEXT,
    education TEXT,
    occupation TEXT,
    source TEXT,
    medium TEXT,
    campaign TEXT,
    status TEXT DEFAULT 'new',
    zoho_lead_id TEXT,
    is_converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMP WITH TIME ZONE,
    conversion_value INTEGER DEFAULT 0,
    conversion_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for duplicate check on mobile
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_mobile ON public.leads(mobile);

-- 2. Lead Events (Lifecycle Audit)
CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Lead Metadata (Attribution)
CREATE TABLE IF NOT EXISTS public.lead_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    visited_pages JSONB DEFAULT '[]'::jsonb,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Contact Inquiries (Separate from leads)
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    reason TEXT,
    message TEXT,
    source TEXT,
    pipeline TEXT,
    tag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id TEXT PRIMARY KEY,
    user_agent TEXT,
    ip_address TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Event Stream / Session Events
CREATE TABLE IF NOT EXISTS public.event_stream (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT,
    event_type TEXT NOT NULL,
    route_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_stream_session ON public.event_stream(session_id);

-- 7. API Requests & System Errors (Dashboard Dependencies)
CREATE TABLE IF NOT EXISTS public.api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route TEXT,
    method TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_runtime_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    route TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 8. Execution Ledgers (Routing, Sync, Dispatch)
CREATE TABLE IF NOT EXISTS public.lead_routing_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID,
    status TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    zoho_id TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_dispatch_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_class TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    worker_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_dead_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_run_id UUID REFERENCES public.job_runs(id) ON DELETE CASCADE,
    job_class TEXT NOT NULL,
    payload JSONB,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
