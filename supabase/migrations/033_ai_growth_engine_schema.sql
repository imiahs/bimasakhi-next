-- Phase 6: AI Automation & Growth Engine Schema

-- 1. Modify Leads Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_source TEXT,
ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'pending';

-- 2. Feature Flags in config store (using existing tool_configs)
INSERT INTO public.tool_configs (tool_name, config_key, config_value) 
VALUES 
    ('AI Automation Engine', 'ai_lead_scoring_enabled', 'true'),
    ('AI Automation Engine', 'ai_lead_routing_enabled', 'true'),
    ('AI Automation Engine', 'ai_followups_enabled', 'true'),
    ('AI Automation Engine', 'ai_insights_enabled', 'true')
ON CONFLICT (config_key) DO NOTHING;

-- 3. AI Decision Audit Logs
CREATE TABLE IF NOT EXISTS public.ai_decision_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL, -- e.g. 'scoring', 'routing', 'followup'
    decision_reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_lead ON public.ai_decision_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_type ON public.ai_decision_logs(decision_type);

-- 4. Lead Routing Logs
CREATE TABLE IF NOT EXISTS public.lead_routing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    routing_reason TEXT,
    routed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_routing_logs_agent ON public.lead_routing_logs(agent_id);

-- 5. Communication Templates
CREATE TABLE IF NOT EXISTS public.communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_type TEXT NOT NULL, -- 'whatsapp', 'email'
    template_name TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed basic Follow-up Templates
INSERT INTO public.communication_templates (template_type, template_name, content, variables)
VALUES 
    ('whatsapp', 'Initial Lead Intro', 'Hello {{lead_name}}, this is {{agent_name}} from Bima Sakhi. Thank you for your interest! Are you available for a quick call today?', '["lead_name", "agent_name"]'),
    ('email', 'Welcome Email', 'Hi {{lead_name}},\n\nWelcome to Bima Sakhi! We received your inquiry and {{agent_name}} will be reaching out soon.\n\nBest,\nThe Bima Sakhi Team', '["lead_name", "agent_name"]')
ON CONFLICT (template_name) DO NOTHING;

-- 6. Marketing Attribution (Campaign Metrics)
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    source TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    converted_leads INTEGER DEFAULT 0,
    roi_score INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(campaign_name, source)
);

-- 7. Agent Performance Metrics Extension
ALTER TABLE public.agent_business_metrics 
ADD COLUMN IF NOT EXISTS leads_assigned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_converted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_minutes INTEGER DEFAULT 0;
