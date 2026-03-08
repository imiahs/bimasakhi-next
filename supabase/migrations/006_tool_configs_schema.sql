-- Migration 006: Tool Configs Schema
CREATE TABLE IF NOT EXISTS public.tool_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tool_name TEXT NOT NULL,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Default Configs for Tools
INSERT INTO public.tool_configs (tool_name, config_key, config_value) 
VALUES 
    ('Commission Calculator', 'first_year_commission', '25'),
    ('Commission Calculator', 'renewal_commission', '5'),
    ('Commission Calculator', 'bonus_rate', '10'),
    ('Income Calculator', 'default_premium', '15000'),
    ('Income Calculator', 'default_policies', '5')
ON CONFLICT (config_key) DO NOTHING;
