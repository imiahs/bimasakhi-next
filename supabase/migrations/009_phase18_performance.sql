-- Phase 18: Performance Optimization Indexes

-- 1. Blog Posts Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- 2. Lead Cache Indexes
CREATE INDEX IF NOT EXISTS idx_lead_cache_source ON lead_cache(source);
CREATE INDEX IF NOT EXISTS idx_lead_cache_created_at ON lead_cache(created_at DESC);

-- 3. SEO Overrides Indexes
CREATE INDEX IF NOT EXISTS idx_seo_overrides_path ON seo_overrides(page_path);

-- 4. Resource Downloads Indexes
CREATE INDEX IF NOT EXISTS idx_resources_download_count ON resources(download_count DESC);

-- 5. Versioning Hooks Lookups
CREATE INDEX IF NOT EXISTS idx_blog_versions_post_id ON blog_post_versions(post_id);
CREATE INDEX IF NOT EXISTS idx_seo_versions_seo_id ON seo_versions(seo_id);
CREATE INDEX IF NOT EXISTS idx_tool_versions_config_id ON tool_config_versions(config_id);
