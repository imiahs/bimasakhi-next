-- 024_dashboard_metrics_schema.sql

-- Extend the search_index_metrics snapshot table to hold new Crawl Budget distribution limits natively.
ALTER TABLE public.search_index_metrics
ADD COLUMN IF NOT EXISTS priority_high INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_medium INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_low INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orphan_pages INTEGER DEFAULT 0;
