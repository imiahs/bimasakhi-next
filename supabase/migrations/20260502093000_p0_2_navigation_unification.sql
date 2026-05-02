ALTER TABLE public.navigation_menu
    ADD COLUMN IF NOT EXISTS menu_key TEXT NOT NULL DEFAULT 'public_header',
    ADD COLUMN IF NOT EXISTS icon_key TEXT,
    ADD COLUMN IF NOT EXISTS note TEXT;

UPDATE public.navigation_menu
SET menu_key = 'public_header'
WHERE menu_key IS NULL;

ALTER TABLE public.navigation_menu
    DROP CONSTRAINT IF EXISTS navigation_menu_menu_key_check;

ALTER TABLE public.navigation_menu
    ADD CONSTRAINT navigation_menu_menu_key_check
    CHECK (menu_key IN ('public_header', 'public_footer', 'admin_sidebar'));

CREATE INDEX IF NOT EXISTS navigation_menu_menu_key_active_order_idx
    ON public.navigation_menu(menu_key, is_active, order_index);

INSERT INTO public.navigation_menu (name, slug, parent_id, order_index, is_active, is_cta, menu_key, updated_at)
SELECT item.name, NULL, NULL, item.order_index, TRUE, FALSE, 'public_footer', NOW()
FROM (
    VALUES
        ('Explore', 0),
        ('Resources', 10),
        ('Legal', 20)
) AS item(name, order_index)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.navigation_menu existing
    WHERE existing.menu_key = 'public_footer'
      AND existing.name = item.name
      AND existing.parent_id IS NULL
);

INSERT INTO public.navigation_menu (name, slug, parent_id, order_index, is_active, is_cta, menu_key, updated_at)
SELECT item.name, item.slug, parent.id, item.order_index, TRUE, FALSE, 'public_footer', NOW()
FROM (
    VALUES
        ('Explore', 'Why Join', '/why', 0),
        ('Explore', 'Income Model', '/income', 10),
        ('Explore', 'Eligibility', '/eligibility', 20),
        ('Explore', 'Apply Now', '/apply', 30),
        ('Resources', 'Downloads', '/downloads', 0),
        ('Resources', 'Contact Us', '/contact', 10),
        ('Resources', 'About Us', '/about', 20),
        ('Legal', 'Privacy Policy', '/privacy-policy', 0),
        ('Legal', 'Terms & Conditions', '/terms-conditions', 10),
        ('Legal', 'Disclaimer', '/disclaimer', 20)
) AS item(group_name, name, slug, order_index)
JOIN public.navigation_menu parent
  ON parent.menu_key = 'public_footer'
 AND parent.name = item.group_name
 AND parent.parent_id IS NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM public.navigation_menu existing
    WHERE existing.menu_key = 'public_footer'
      AND existing.name = item.name
      AND existing.parent_id = parent.id
);

INSERT INTO public.navigation_menu (name, slug, parent_id, order_index, is_active, is_cta, menu_key, icon_key, note, updated_at)
SELECT item.name, item.slug, NULL, item.order_index, TRUE, FALSE, 'admin_sidebar', item.icon_key, item.note, NOW()
FROM (
    VALUES
        ('Dashboard', '/admin', 0, 'HQ', 'Mission control'),
        ('Dashboard View', '/admin/dashboard', 10, 'HQ', 'Legacy dashboard'),
        ('Profile', '/admin/profile', 20, 'CR', 'Operator profile'),
        ('Content', NULL, 100, NULL, NULL),
        ('System', NULL, 110, NULL, NULL),
        ('Control', NULL, 120, NULL, NULL),
        ('Analytics', NULL, 130, NULL, NULL)
) AS item(name, slug, order_index, icon_key, note)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.navigation_menu existing
    WHERE existing.menu_key = 'admin_sidebar'
      AND existing.name = item.name
      AND existing.parent_id IS NULL
);

INSERT INTO public.navigation_menu (name, slug, parent_id, order_index, is_active, is_cta, menu_key, icon_key, note, updated_at)
SELECT item.name, item.slug, parent.id, item.order_index, TRUE, FALSE, 'admin_sidebar', item.icon_key, item.note, NOW()
FROM (
    VALUES
        ('Content', 'Content Center', '/admin/ccc', 0, 'CC', 'Draft review'),
        ('Content', 'Drafts', '/admin/ccc/drafts', 10, 'CC', 'Draft inventory'),
        ('Content', 'Bulk Planner', '/admin/ccc/bulk', 20, 'BK', 'Job planner'),
        ('Content', 'Pages', '/admin/pages', 30, 'PG', 'CMS page builder'),
        ('Content', 'Blog', '/admin/blog', 40, 'PG', 'Blog publishing'),
        ('Content', 'Media', '/admin/media', 50, 'CC', 'Asset library'),
        ('Content', 'Resources', '/admin/resources', 60, 'CC', 'Download assets'),
        ('Content', 'SEO', '/admin/seo', 70, 'PG', 'SEO controls'),
        ('Content', 'SEO Index', '/admin/seo/index', 80, 'PG', 'Index inventory'),
        ('Content', 'Index Health', '/admin/seo/index-health', 90, 'AN', 'Search health'),
        ('Content', 'Content Quality', '/admin/seo/content-quality', 100, 'AN', 'Content QA'),
        ('Content', 'SEO Generation', '/admin/seo/generation', 110, 'AI', 'SEO generation tools'),
        ('System', 'Queue', '/admin/ai', 0, 'AI', 'Worker engine'),
        ('System', 'AI Content', '/admin/ai/content', 10, 'AI', 'AI content controls'),
        ('System', 'AI CTA', '/admin/ai/cta', 20, 'AI', 'CTA generation'),
        ('System', 'AI Growth', '/admin/ai/growth', 30, 'AI', 'Growth experiments'),
        ('System', 'AI Landing', '/admin/ai/landing', 40, 'AI', 'Landing experiments'),
        ('System', 'AI Recruiter', '/admin/ai/recruiter', 50, 'AI', 'Recruiter flows'),
        ('System', 'Logs', '/admin/logs', 60, 'LG', 'Runtime trail'),
        ('System', 'System Overview', '/admin/system', 70, 'HB', 'System rollup'),
        ('System', 'Audit', '/admin/system/audit', 80, 'LG', 'Action history'),
        ('System', 'Health', '/admin/system/health', 90, 'HB', 'Vendor resilience'),
        ('System', 'Observability', '/admin/system/observability', 100, 'LG', 'Event bus telemetry'),
        ('System', 'Workers', '/admin/system/workers', 110, 'BK', 'Worker reliability'),
        ('System', 'Alerts', '/admin/system/alerts', 120, 'LG', 'System alerts'),
        ('System', 'Code', '/admin/system/code', 130, 'LG', 'Visibility layer'),
        ('System', 'DLQ', '/admin/system/dlq', 140, 'DL', 'Dead letters'),
        ('System', 'Performance', '/admin/system/performance', 150, 'AN', 'Performance telemetry'),
        ('System', 'Failed', '/admin/failed', 160, 'RX', 'Failed operations'),
        ('System', 'Failed Leads', '/admin/failed-leads', 170, 'RX', 'Recovery lane'),
        ('System', 'Errors', '/admin/errors', 180, 'RX', 'Error inventory'),
        ('System', 'Automation', '/admin/automation', 190, 'CN', 'Automation controls'),
        ('System', 'Tools', '/admin/tools', 200, 'PG', 'Operator tools'),
        ('Control', 'CRM', '/admin/crm', 0, 'CR', 'Lead operations'),
        ('Control', 'Leads', '/admin/leads', 10, 'CR', 'Lead inventory'),
        ('Control', 'Locations', '/admin/locations', 20, 'GL', 'Location inventory'),
        ('Control', 'Geo', '/admin/locations/geo', 30, 'GL', 'Coverage intel'),
        ('Control', 'Navigation', '/admin/navigation', 40, 'PG', 'Menu control'),
        ('Control', 'Features', '/admin/control/features', 50, 'CN', 'Toggle controls'),
        ('Control', 'Workflow', '/admin/control/workflow', 60, 'CN', 'Thresholds and caps'),
        ('Control', 'Users', '/admin/users', 70, 'CR', 'Access control'),
        ('Control', 'Settings', '/admin/settings', 80, 'CN', 'Runtime switches'),
        ('Control', 'Backups', '/admin/settings/backups', 90, 'PG', 'Backup operations'),
        ('Analytics', 'Analytics', '/admin/analytics', 0, 'AN', 'Attribution'),
        ('Analytics', 'Growth', '/admin/growth', 10, 'AN', 'Growth metrics'),
        ('Analytics', 'Network', '/admin/network', 20, 'AN', 'Agency network'),
        ('Analytics', 'Leaderboard', '/admin/network/leaderboard', 30, 'AN', 'Network leaderboard'),
        ('Analytics', 'Competitions', '/admin/network/competitions', 40, 'AN', 'Competition tracking'),
        ('Analytics', 'Coaching', '/admin/network/coaching', 50, 'AN', 'Coaching insights'),
        ('Analytics', 'DO Appraisal', '/admin/do/appraisal', 60, 'AN', 'Performance review')
) AS item(group_name, name, slug, order_index, icon_key, note)
JOIN public.navigation_menu parent
  ON parent.menu_key = 'admin_sidebar'
 AND parent.name = item.group_name
 AND parent.parent_id IS NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM public.navigation_menu existing
    WHERE existing.menu_key = 'admin_sidebar'
      AND existing.name = item.name
      AND existing.parent_id = parent.id
);