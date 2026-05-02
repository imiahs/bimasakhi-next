export const ADMIN_PINNED_ROUTES = [
    { label: 'Dashboard', href: '/admin', icon: 'HQ', note: 'Mission control' },
    { label: 'Dashboard View', href: '/admin/dashboard', icon: 'HQ', note: 'Legacy dashboard' },
    { label: 'Profile', href: '/admin/profile', icon: 'CR', note: 'Operator profile' },
];

export const ADMIN_ROUTE_GROUPS = [
    {
        id: 'content',
        label: 'Content',
        routes: [
            { label: 'Content Center', href: '/admin/ccc', icon: 'CC', note: 'Draft review' },
            { label: 'Drafts', href: '/admin/ccc/drafts', icon: 'CC', note: 'Draft inventory' },
            { label: 'Bulk Planner', href: '/admin/ccc/bulk', icon: 'BK', note: 'Job planner' },
            { label: 'Pages', href: '/admin/pages', icon: 'PG', note: 'CMS page builder' },
            { label: 'Blog', href: '/admin/blog', icon: 'PG', note: 'Blog publishing' },
            { label: 'Media', href: '/admin/media', icon: 'CC', note: 'Asset library' },
            { label: 'Resources', href: '/admin/resources', icon: 'CC', note: 'Download assets' },
            { label: 'SEO', href: '/admin/seo', icon: 'PG', note: 'SEO controls' },
            { label: 'SEO Index', href: '/admin/seo/index', icon: 'PG', note: 'Index inventory' },
            { label: 'Index Health', href: '/admin/seo/index-health', icon: 'AN', note: 'Search health' },
            { label: 'Content Quality', href: '/admin/seo/content-quality', icon: 'AN', note: 'Content QA' },
            { label: 'SEO Generation', href: '/admin/seo/generation', icon: 'AI', note: 'SEO generation tools' },
        ],
    },
    {
        id: 'system',
        label: 'System',
        routes: [
            { label: 'Queue', href: '/admin/ai', icon: 'AI', note: 'Worker engine' },
            { label: 'AI Content', href: '/admin/ai/content', icon: 'AI', note: 'AI content controls' },
            { label: 'AI CTA', href: '/admin/ai/cta', icon: 'AI', note: 'CTA generation' },
            { label: 'AI Growth', href: '/admin/ai/growth', icon: 'AI', note: 'Growth experiments' },
            { label: 'AI Landing', href: '/admin/ai/landing', icon: 'AI', note: 'Landing experiments' },
            { label: 'AI Recruiter', href: '/admin/ai/recruiter', icon: 'AI', note: 'Recruiter flows' },
            { label: 'Logs', href: '/admin/logs', icon: 'LG', note: 'Runtime trail' },
            { label: 'System Overview', href: '/admin/system', icon: 'HB', note: 'System rollup' },
            { label: 'Audit', href: '/admin/system/audit', icon: 'LG', note: 'Action history' },
            { label: 'Health', href: '/admin/system/health', icon: 'HB', note: 'Vendor resilience' },
            { label: 'Observability', href: '/admin/system/observability', icon: 'LG', note: 'Event bus telemetry' },
            { label: 'Workers', href: '/admin/system/workers', icon: 'BK', note: 'Worker reliability' },
            { label: 'Alerts', href: '/admin/system/alerts', icon: 'LG', note: 'System alerts' },
            { label: 'Code', href: '/admin/system/code', icon: 'LG', note: 'Visibility layer' },
            { label: 'DLQ', href: '/admin/system/dlq', icon: 'DL', note: 'Dead letters' },
            { label: 'Performance', href: '/admin/system/performance', icon: 'AN', note: 'Performance telemetry' },
            { label: 'Failed', href: '/admin/failed', icon: 'RX', note: 'Failed operations' },
            { label: 'Failed Leads', href: '/admin/failed-leads', icon: 'RX', note: 'Recovery lane' },
            { label: 'Errors', href: '/admin/errors', icon: 'RX', note: 'Error inventory' },
            { label: 'Automation', href: '/admin/automation', icon: 'CN', note: 'Automation controls' },
            { label: 'Tools', href: '/admin/tools', icon: 'PG', note: 'Operator tools' },
        ],
    },
    {
        id: 'control',
        label: 'Control',
        routes: [
            { label: 'CRM', href: '/admin/crm', icon: 'CR', note: 'Lead operations' },
            { label: 'Leads', href: '/admin/leads', icon: 'CR', note: 'Lead inventory' },
            { label: 'Locations', href: '/admin/locations', icon: 'GL', note: 'Location inventory' },
            { label: 'Geo', href: '/admin/locations/geo', icon: 'GL', note: 'Coverage intel' },
            { label: 'Navigation', href: '/admin/navigation', icon: 'PG', note: 'Menu control' },
            { label: 'Features', href: '/admin/control/features', icon: 'CN', note: 'Toggle controls' },
            { label: 'Workflow', href: '/admin/control/workflow', icon: 'CN', note: 'Thresholds and caps' },
            { label: 'Users', href: '/admin/users', icon: 'CR', note: 'Access control' },
            { label: 'Settings', href: '/admin/settings', icon: 'CN', note: 'Runtime switches' },
            { label: 'Backups', href: '/admin/settings/backups', icon: 'PG', note: 'Backup operations' },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics',
        routes: [
            { label: 'Analytics', href: '/admin/analytics', icon: 'AN', note: 'Attribution' },
            { label: 'Growth', href: '/admin/growth', icon: 'AN', note: 'Growth metrics' },
            { label: 'Network', href: '/admin/network', icon: 'AN', note: 'Agency network' },
            { label: 'Leaderboard', href: '/admin/network/leaderboard', icon: 'AN', note: 'Network leaderboard' },
            { label: 'Competitions', href: '/admin/network/competitions', icon: 'AN', note: 'Competition tracking' },
            { label: 'Coaching', href: '/admin/network/coaching', icon: 'AN', note: 'Coaching insights' },
            { label: 'DO Appraisal', href: '/admin/do/appraisal', icon: 'AN', note: 'Performance review' },
        ],
    },
];

function normalizeAdminRoute(item = {}) {
    return {
        label: item.label || item.name || 'Untitled',
        href: item.href || item.slug || null,
        icon: item.icon || item.icon_key || 'PG',
        note: item.note || null,
    };
}

function buildActiveRouteOrder(routes) {
    return [...routes].sort((left, right) => right.href.length - left.href.length);
}

const FLAT_ADMIN_ROUTES = [...ADMIN_PINNED_ROUTES, ...ADMIN_ROUTE_GROUPS.flatMap((group) => group.routes)].map(normalizeAdminRoute);
const ACTIVE_ROUTE_ORDER = buildActiveRouteOrder(FLAT_ADMIN_ROUTES);
const ACTIVE_ROUTE_CACHE = new Map();

export function flattenAdminRoutes(pinnedRoutes = ADMIN_PINNED_ROUTES, routeGroups = ADMIN_ROUTE_GROUPS) {
    return [
        ...pinnedRoutes.map((route) => normalizeAdminRoute(route)),
        ...routeGroups.flatMap((group) => (group.routes || []).map((route) => normalizeAdminRoute(route))),
    ].filter((route) => route.href);
}

export function buildAdminNavigationFromTree(menuTree = []) {
    const pinnedRoutes = [];
    const routeGroups = [];

    for (const item of menuTree) {
        if (item.slug) {
            pinnedRoutes.push(normalizeAdminRoute(item));
            continue;
        }

        const childRoutes = (item.children || [])
            .filter((child) => child.slug)
            .map((child) => normalizeAdminRoute(child));

        if (!childRoutes.length) {
            continue;
        }

        routeGroups.push({
            id: item.id || String(item.name || routeGroups.length),
            label: item.name || 'Group',
            routes: childRoutes,
        });
    }

    return {
        pinnedRoutes: pinnedRoutes.length ? pinnedRoutes : ADMIN_PINNED_ROUTES,
        routeGroups: routeGroups.length ? routeGroups : ADMIN_ROUTE_GROUPS,
    };
}

export function matchesAdminRoute(pathname, href) {
    if (!pathname || !href) {
        return false;
    }

    if (href === '/admin') {
        return pathname === '/admin';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveAdminRoute(pathname, { pinnedRoutes = ADMIN_PINNED_ROUTES, routeGroups = ADMIN_ROUTE_GROUPS } = {}) {
    if (!pathname) {
        return pinnedRoutes[0] || ADMIN_PINNED_ROUTES[0];
    }

    const usingDefaults = pinnedRoutes === ADMIN_PINNED_ROUTES && routeGroups === ADMIN_ROUTE_GROUPS;

    if (usingDefaults) {
        const cachedRoute = ACTIVE_ROUTE_CACHE.get(pathname);
        if (cachedRoute) {
            return cachedRoute;
        }
    }

    const activeRouteOrder = usingDefaults
        ? ACTIVE_ROUTE_ORDER
        : buildActiveRouteOrder(flattenAdminRoutes(pinnedRoutes, routeGroups));

    const activeRoute = activeRouteOrder.find((route) => matchesAdminRoute(pathname, route.href))
        || pinnedRoutes[0]
        || ADMIN_PINNED_ROUTES[0];

    if (usingDefaults) {
        ACTIVE_ROUTE_CACHE.set(pathname, activeRoute);
    }

    return activeRoute;
}