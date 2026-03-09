-- 025_network_os_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    agent_id UUID PRIMARY KEY, -- Links to auth.users theoretically (or managed directly)
    name TEXT NOT NULL,
    mobile TEXT,
    city TEXT,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending', -- pending, active, inactive
    role TEXT DEFAULT 'agent', -- agent, team_leader, development_officer
    parent_agent_id UUID REFERENCES public.agents(agent_id) ON DELETE SET NULL,
    depth_level INTEGER DEFAULT 0,
    ref_code TEXT UNIQUE NOT NULL,
    activation_status TEXT DEFAULT 'recruited', -- recruited, training, activated, inactive
    first_policy_date TIMESTAMP WITH TIME ZONE,
    last_business_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_parent ON public.agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_ref_code ON public.agents(ref_code);

-- 2. Recruitment Pipeline
CREATE TABLE IF NOT EXISTS public.recruitment_pipeline (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_code TEXT REFERENCES public.agents(ref_code) ON DELETE CASCADE,
    name TEXT,
    mobile TEXT,
    stage TEXT DEFAULT 'apply', -- apply, profile_review, exam_preparation, training, onboard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_candidate_stage ON public.recruitment_pipeline(candidate_id, stage);

-- 3. Training Hub
CREATE TABLE IF NOT EXISTS public.training_modules (
    module_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT, -- pdf, video, mock_test
    content_url TEXT, -- supabase storage path
    lic_syllabus_topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.training_modules(module_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'started', -- started, completed
    score INTEGER, -- for mock tests
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(agent_id, module_id)
);

-- 4. Business Targets & CRM
CREATE TABLE IF NOT EXISTS public.agent_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    target_month VARCHAR(7), -- YYYY-MM
    policy_target INTEGER DEFAULT 0,
    premium_target NUMERIC DEFAULT 0,
    recruitment_target INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, target_month)
);

CREATE TABLE IF NOT EXISTS public.prospects (
    prospect_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT,
    stage TEXT DEFAULT 'lead', -- lead, proposal, issued, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_agent_stage ON public.prospects(agent_id, stage);

CREATE TABLE IF NOT EXISTS public.policies (
    policy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    policy_type TEXT,
    premium_amount NUMERIC DEFAULT 0,
    policy_start_date DATE,
    policy_status TEXT DEFAULT 'active', -- active, lapsed, surrendered, archived
    renewal_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_agent ON public.policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_policies_renewal ON public.policies(renewal_date);

CREATE TABLE IF NOT EXISTS public.renewals (
    renewal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES public.policies(policy_id) ON DELETE CASCADE,
    renewal_due_date DATE,
    status TEXT DEFAULT 'pending', -- pending, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewals_policy ON public.renewals(policy_id);

-- 5. Business Insights (Cache Tables)
CREATE TABLE IF NOT EXISTS public.persistency_metrics (
    agent_id UUID PRIMARY KEY REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    total_policies INTEGER DEFAULT 0,
    renewed_policies INTEGER DEFAULT 0,
    lapsed_policies INTEGER DEFAULT 0,
    renewal_ratio NUMERIC DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persistency_metrics_agent ON public.persistency_metrics(agent_id);

CREATE TABLE IF NOT EXISTS public.agent_business_metrics (
    agent_id UUID PRIMARY KEY REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    total_policies INTEGER DEFAULT 0,
    monthly_sales NUMERIC DEFAULT 0,
    renewal_ratio NUMERIC DEFAULT 0.00,
    team_business NUMERIC DEFAULT 0,
    team_size INTEGER DEFAULT 0,
    team_depth INTEGER DEFAULT 0,
    team_activation_count INTEGER DEFAULT 0,
    target_progress JSONB DEFAULT '{}'::jsonb,
    competition_rankings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_business_metrics_agent ON public.agent_business_metrics(agent_id);

-- 6. Competitions System
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT, -- central, zonal, divisional, branch
    type TEXT, -- one_dayer, fixed_period
    criteria TEXT, -- policy_count, premium_based
    duration_start TIMESTAMP WITH TIME ZONE,
    duration_end TIMESTAMP WITH TIME ZONE,
    rewards TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitions_duration ON public.competitions(duration_start, duration_end);

CREATE TABLE IF NOT EXISTS public.agent_competition_participation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
    achieved_value NUMERIC DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, competition_id)
);

-- 7. Motivation & Notifications
CREATE TABLE IF NOT EXISTS public.agent_motivation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT, -- daily_tip, webinar, sales_script
    content TEXT NOT NULL,
    scheduled_for DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    type TEXT, -- renewal_reminder, coaching_alert, competition_update
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_notifications_agent ON public.agent_notifications(agent_id, is_read);


-- 8. Row Level Security (RLS) Policies
-- The RLS policies strictly gate agent and teams.

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

-- Base Agent rules (Agents can view and edit their own isolated data)
CREATE POLICY "Agent read own profile" ON public.agents FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agent read own prospects" ON public.prospects FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agent read own policies" ON public.policies FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agent read own metrics" ON public.agent_business_metrics FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agent read own persistency" ON public.persistency_metrics FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Agent read own notifications" ON public.agent_notifications FOR SELECT USING (agent_id = auth.uid());

-- Team Leader / Development Officer rules (Can view downlines)
-- We use a naive parent_agent_id check for Team Leaders reading team data.
CREATE POLICY "TL read team profile" ON public.agents FOR SELECT USING (parent_agent_id = auth.uid());
CREATE POLICY "TL read team metrics" ON public.agent_business_metrics FOR SELECT USING (agent_id IN (SELECT agent_id FROM public.agents WHERE parent_agent_id = auth.uid()));

-- Development Officers (DO) can read all theoretically if mapped to a global DO status, but this system models local DO growth.
-- So we can add bypass rules via a secure RPC or explicit DO mapping.
