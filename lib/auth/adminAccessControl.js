export const ADMIN_ROLES = ['super_admin', 'admin', 'editor', 'agent'];
export const ALL_ADMIN_ROLES = [...ADMIN_ROLES];

const MUTATION_METHOD_TO_CAPABILITY = {
    GET: 'view',
    HEAD: 'view',
    OPTIONS: 'view',
    POST: 'create',
    PUT: 'edit',
    PATCH: 'edit',
    DELETE: 'delete',
};

const FULL_ACCESS = {
    view: ALL_ADMIN_ROLES,
    create: ALL_ADMIN_ROLES,
    edit: ALL_ADMIN_ROLES,
    delete: ALL_ADMIN_ROLES,
};

export const ADMIN_ACCESS_MODULES = [
    {
        key: 'session',
        label: 'Session',
        pagePrefixes: [],
        apiPrefixes: ['/api/admin/check', '/api/admin/logout'],
        permissions: FULL_ACCESS,
    },
    {
        key: 'profile',
        label: 'Profile',
        pagePrefixes: ['/admin/profile'],
        apiPrefixes: [],
        permissions: {
            view: ALL_ADMIN_ROLES,
            create: [],
            edit: ALL_ADMIN_ROLES,
            delete: [],
        },
    },
    {
        key: 'dashboard',
        label: 'Dashboard',
        pagePrefixes: ['/admin', '/admin/dashboard'],
        apiPrefixes: ['/api/admin/dashboard', '/api/admin/queue', '/api/admin/stats'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'content',
        label: 'Content',
        pagePrefixes: ['/admin/ccc', '/admin/pages', '/admin/blog', '/admin/media', '/admin/resources', '/admin/seo'],
        apiPrefixes: ['/api/admin/ccc', '/api/admin/pages', '/api/admin/blog', '/api/admin/media', '/api/admin/resources', '/api/admin/seo'],
        permissions: {
            view: ['super_admin', 'admin', 'editor'],
            create: ['super_admin', 'admin', 'editor'],
            edit: ['super_admin', 'admin', 'editor'],
            delete: ['super_admin', 'admin'],
        },
    },
    {
        key: 'locations',
        label: 'Locations',
        pagePrefixes: ['/admin/locations'],
        apiPrefixes: ['/api/admin/locations'],
        permissions: {
            view: ['super_admin', 'admin', 'editor'],
            create: ['super_admin', 'admin', 'editor'],
            edit: ['super_admin', 'admin', 'editor'],
            delete: ['super_admin', 'admin'],
        },
    },
    {
        key: 'crm',
        label: 'CRM and Leads',
        pagePrefixes: ['/admin/crm', '/admin/leads'],
        apiPrefixes: ['/api/admin/leads'],
        permissions: {
            view: ['super_admin', 'admin'],
            create: ['super_admin', 'admin'],
            edit: ['super_admin', 'admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'analytics',
        label: 'Analytics',
        pagePrefixes: ['/admin/analytics', '/admin/growth', '/admin/network', '/admin/do'],
        apiPrefixes: ['/api/admin/metrics'],
        permissions: {
            view: ['super_admin', 'admin'],
            create: [],
            edit: [],
            delete: [],
        },
    },
    {
        key: 'navigation',
        label: 'Navigation',
        pagePrefixes: ['/admin/navigation'],
        apiPrefixes: ['/api/admin/navigation'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'feature_flags',
        label: 'Feature Flags',
        pagePrefixes: ['/admin/control/features'],
        apiPrefixes: ['/api/admin/feature-flags'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'workflow',
        label: 'Workflow and Settings',
        pagePrefixes: ['/admin/control/workflow', '/admin/settings'],
        apiPrefixes: ['/api/admin/workflow-config', '/api/admin/config'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'users',
        label: 'Users',
        pagePrefixes: ['/admin/users'],
        apiPrefixes: ['/api/admin/users'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
    {
        key: 'system',
        label: 'System',
        pagePrefixes: ['/admin/system', '/admin/logs', '/admin/automation', '/admin/tools', '/admin/failed', '/admin/failed-leads', '/admin/ai'],
        apiPrefixes: ['/api/admin/system', '/api/admin/logs', '/api/admin/actions', '/api/admin/dlq', '/api/admin/alert', '/api/admin/vendor-health', '/api/admin/failed', '/api/admin/action-queue', '/api/admin/recommendations', '/api/admin/alerts'],
        permissions: {
            view: ['super_admin'],
            create: ['super_admin'],
            edit: ['super_admin'],
            delete: ['super_admin'],
        },
    },
];

const DEFAULT_LANDING_PATH_BY_ROLE = {
    super_admin: '/admin',
    admin: '/admin/crm',
    editor: '/admin/ccc',
    agent: '/admin/profile',
};

function normalizeRole(role) {
    return ADMIN_ROLES.includes(role) ? role : null;
}

function uniqueRoles(roles = []) {
    return Array.from(new Set((roles || []).filter(Boolean)));
}

function matchesPathPrefix(pathname, prefix) {
    if (!pathname || !prefix) {
        return false;
    }

    if (pathname === prefix) {
        return true;
    }

    if (prefix === '/admin') {
        return pathname === '/admin';
    }

    return pathname.startsWith(`${prefix}/`);
}

function getPrefixesForSurface(module, surface) {
    return surface === 'api' ? (module.apiPrefixes || []) : (module.pagePrefixes || []);
}

function findBestMatchingModule(pathname, surface) {
    let selectedModule = null;
    let selectedPrefixLength = -1;

    for (const module of ADMIN_ACCESS_MODULES) {
        const matchingPrefix = getPrefixesForSurface(module, surface)
            .filter((prefix) => matchesPathPrefix(pathname, prefix))
            .sort((left, right) => right.length - left.length)[0];

        if (!matchingPrefix) {
            continue;
        }

        if (matchingPrefix.length > selectedPrefixLength) {
            selectedModule = module;
            selectedPrefixLength = matchingPrefix.length;
        }
    }

    return selectedModule;
}

export function getAdminCapabilityForMethod(method = 'GET') {
    return MUTATION_METHOD_TO_CAPABILITY[String(method).toUpperCase()] || 'view';
}

export function getAdminAccessPolicy({ pathname, method = 'GET', surface = 'api', fallbackRoles = null } = {}) {
    const capability = getAdminCapabilityForMethod(method);
    const module = findBestMatchingModule(pathname, surface);

    if (module) {
        return {
            module,
            capability,
            allowedRoles: uniqueRoles(module.permissions?.[capability] || []),
        };
    }

    if (fallbackRoles && fallbackRoles.length > 0) {
        return {
            module: null,
            capability,
            allowedRoles: uniqueRoles(fallbackRoles),
        };
    }

    return {
        module: null,
        capability,
        allowedRoles: ['super_admin'],
    };
}

export function getAdminAccessDecision({ role, pathname, method = 'GET', surface = 'api', fallbackRoles = null } = {}) {
    const normalizedRole = normalizeRole(role);
    const policy = getAdminAccessPolicy({ pathname, method, surface, fallbackRoles });

    return {
        ...policy,
        role: normalizedRole,
        allowed: Boolean(normalizedRole && policy.allowedRoles.includes(normalizedRole)),
    };
}

export function getAdminLandingPath(role) {
    return DEFAULT_LANDING_PATH_BY_ROLE[normalizeRole(role)] || '/admin/login';
}

export function canViewAdminRoute(role, href) {
    return getAdminAccessDecision({ role, pathname: href, method: 'GET', surface: 'page' }).allowed;
}

export function filterAdminNavigationByRole(navigation, role) {
    const pinnedRoutes = (navigation?.pinnedRoutes || []).filter((route) => canViewAdminRoute(role, route.href));
    const routeGroups = (navigation?.routeGroups || [])
        .map((group) => ({
            ...group,
            routes: (group.routes || []).filter((route) => canViewAdminRoute(role, route.href)),
        }))
        .filter((group) => group.routes.length > 0);

    return { pinnedRoutes, routeGroups };
}

export function getAdminAccessModel() {
    return ADMIN_ACCESS_MODULES.map((module) => ({
        key: module.key,
        label: module.label,
        permissions: {
            view: uniqueRoles(module.permissions?.view || []),
            create: uniqueRoles(module.permissions?.create || []),
            edit: uniqueRoles(module.permissions?.edit || []),
            delete: uniqueRoles(module.permissions?.delete || []),
        },
    }));
}