-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_event_stream_created_at ON public.event_stream (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON public.api_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON public.crm_leads (created_at DESC);

-- Prepare partitioning for event_stream (Future scaling, adding constraint as preparation)
-- For now, just a retention function to clean up > 90 days.
CREATE OR REPLACE FUNCTION public.cleanup_old_event_stream()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.event_stream WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- RPC for atomic content metric increments
CREATE OR REPLACE FUNCTION public.increment_content_views(path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.content_metrics (target_path, views, updated_at) 
  VALUES (path, 1, NOW())
  ON CONFLICT (target_path) 
  DO UPDATE SET views = public.content_metrics.views + 1, updated_at = NOW();
END;
$$;

-- RPC for atomic traffic source increments
CREATE OR REPLACE FUNCTION public.increment_traffic_source(src text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.traffic_sources (source, visits, updated_at) 
  VALUES (src, 1, NOW())
  ON CONFLICT (source) 
  DO UPDATE SET visits = public.traffic_sources.visits + 1, updated_at = NOW();
END;
$$;
