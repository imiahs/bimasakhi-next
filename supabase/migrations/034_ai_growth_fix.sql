-- Migration 034: AI Growth Engine Fixes & Stabilization

-- 1. RPC for Atomic Agent Assignment Counter
CREATE OR REPLACE FUNCTION increment_agent_assignments(agent_uid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE agent_business_metrics
    SET leads_assigned = leads_assigned + 1
    WHERE agent_id = agent_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_lead_routing_logs_lead_id ON public.lead_routing_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_source ON public.leads(marketing_source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
