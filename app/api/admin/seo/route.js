import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getServiceSupabase } from '@/utils/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const runtime = 'nodejs';

const STATIC_ROUTE_SURFACES = [
    {
        path: '/',
        title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)',
        description: 'Join Bima Sakhi, a premier LIC agency career platform for women in Delhi NCR. High commission structure with full mentorship.',
        source_type: 'homepage',
        source_label: 'Homepage',
        metadata_strategy: 'seo_helper',
        supports_seo_override: true,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Homepage content renders from homepage_sections; legacy home-editor tabs are not treated as canonical runtime authority.',
    },
    {
        path: '/why',
        title: 'Why Become Bima Sakhi? – LIC Career Benefits',
        description: 'Secure your financial independence. Discover the benefits of becoming an LIC agent with Bima Sakhi.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'seo_helper',
        supports_seo_override: true,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Runtime metadata is already wired through the shared SEO helper.',
    },
    {
        path: '/income',
        title: 'LIC Agent Income Calculator | Bima Sakhi',
        description: 'Calculate your potential earnings as an LIC agent with our free commission calculator.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'seo_helper',
        supports_seo_override: true,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Runtime metadata is already wired through the shared SEO helper.',
    },
    {
        path: '/eligibility',
        title: 'LIC Agent Eligibility & Requirements | Bima Sakhi',
        description: 'Check if you qualify to become an LIC Bima Sakhi agent. Education, age, document requirements.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'seo_helper',
        supports_seo_override: true,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Runtime metadata is already wired through the shared SEO helper.',
    },
    {
        path: '/apply',
        title: 'Apply to Become an LIC Agent | Bima Sakhi',
        description: 'Start your journey with LIC today. Submit your application for the Bima Sakhi program.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/about',
        title: 'About Bima Sakhi | Bima Sakhi',
        description: 'About the Bima Sakhi program and mission.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/contact',
        title: 'Contact Bima Sakhi | Bima Sakhi',
        description: 'Contact the Bima Sakhi team.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/downloads',
        title: 'Downloads | Bima Sakhi',
        description: 'Downloads and supporting documents for Bima Sakhi users.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/privacy-policy',
        title: 'Privacy Policy | Bima Sakhi',
        description: 'Privacy policy for the Bima Sakhi platform.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/terms-conditions',
        title: 'Terms & Conditions | Bima Sakhi',
        description: 'Terms and conditions for the Bima Sakhi platform.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/disclaimer',
        title: 'Disclaimer | Bima Sakhi',
        description: 'Disclaimer for the Bima Sakhi platform.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/thank-you',
        title: 'Thank You | Bima Sakhi',
        description: 'Application confirmation and next steps.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/tools',
        title: 'Tools | Bima Sakhi',
        description: 'Interactive tools and calculators for Bima Sakhi users.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
    {
        path: '/blog',
        title: 'Blog | Bima Sakhi',
        description: 'Published blog articles for the Bima Sakhi platform.',
        source_type: 'blog_index',
        source_label: 'Blog index',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/blog',
        editor_label: 'Open blog manager',
        note: 'Individual blog posts below are runtime-authoritative and override-capable; the index page metadata remains inline.',
    },
    {
        path: '/resources',
        title: 'Resources | Bima Sakhi',
        description: 'Resources published for the Bima Sakhi platform.',
        source_type: 'resource_index',
        source_label: 'Resource index',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/resources',
        editor_label: 'Open resources manager',
        note: 'The resource index page remains inline; individual resources are managed in the admin resources surface.',
    },
    {
        path: '/bima-sakhi-delhi',
        title: 'Bima Sakhi Delhi | Bima Sakhi',
        description: 'Delhi landing page for the Bima Sakhi platform.',
        source_type: 'static_route',
        source_label: 'Static route',
        metadata_strategy: 'inline_static',
        supports_seo_override: false,
        authority_labels: ['RUNTIME_AUTHORITATIVE', 'ADMIN_VISIBLE'],
        authority_risk: 'PARTIALLY_SAFE',
        editor_path: '/admin/seo',
        editor_label: 'Open SEO manager',
        note: 'Visible here for authority classification; runtime metadata is still defined inline in the route file.',
    },
];

const PUBLIC_STATIC_RUNTIME_PAGE_FILES = [
    'app/page.js',
    'app/about/page.js',
    'app/apply/page.js',
    'app/bima-sakhi-delhi/page.js',
    'app/blog/page.js',
    'app/contact/page.js',
    'app/disclaimer/page.js',
    'app/downloads/page.js',
    'app/eligibility/page.js',
    'app/income/page.js',
    'app/privacy-policy/page.js',
    'app/resources/page.js',
    'app/terms-conditions/page.js',
    'app/thank-you/page.js',
    'app/tools/page.js',
    'app/tools/lic-commission-calculator/page.js',
    'app/tools/lic-income-calculator/page.js',
    'app/why/page.js',
];

const AGENT_STATIC_RUNTIME_PAGE_FILES = [
    'app/agent/business/page.js',
    'app/agent/dashboard/page.js',
    'app/agent/motivation/page.js',
    'app/agent/training/page.js',
];

const ADMIN_STATIC_RUNTIME_PAGE_FILES = [
    'app/admin/page.js',
    'app/admin/ai/page.js',
    'app/admin/ai/content/page.js',
    'app/admin/ai/cta/page.js',
    'app/admin/ai/growth/page.js',
    'app/admin/ai/landing/page.js',
    'app/admin/ai/recruiter/page.js',
    'app/admin/analytics/page.js',
    'app/admin/automation/page.js',
    'app/admin/blog/page.js',
    'app/admin/ccc/page.js',
    'app/admin/ccc/bulk/page.js',
    'app/admin/ccc/drafts/page.js',
    'app/admin/control/features/page.js',
    'app/admin/control/workflow/page.js',
    'app/admin/crm/page.js',
    'app/admin/dashboard/page.js',
    'app/admin/do/appraisal/page.js',
    'app/admin/errors/page.js',
    'app/admin/failed/page.js',
    'app/admin/failed-leads/page.js',
    'app/admin/growth/page.js',
    'app/admin/leads/page.js',
    'app/admin/locations/page.js',
    'app/admin/locations/geo/page.js',
    'app/admin/login/page.js',
    'app/admin/logs/page.js',
    'app/admin/media/page.js',
    'app/admin/navigation/page.js',
    'app/admin/network/page.js',
    'app/admin/network/coaching/page.js',
    'app/admin/network/competitions/page.js',
    'app/admin/network/leaderboard/page.js',
    'app/admin/pages/page.js',
    'app/admin/profile/page.js',
    'app/admin/resources/page.js',
    'app/admin/seo/page.js',
    'app/admin/seo/content-quality/page.js',
    'app/admin/seo/generation/page.js',
    'app/admin/seo/index/page.js',
    'app/admin/seo/index-health/page.js',
    'app/admin/settings/page.js',
    'app/admin/settings/backups/page.js',
    'app/admin/system/page.js',
    'app/admin/system/alerts/page.js',
    'app/admin/system/audit/page.js',
    'app/admin/system/code/page.js',
    'app/admin/system/dlq/page.js',
    'app/admin/system/health/page.js',
    'app/admin/system/observability/page.js',
    'app/admin/system/performance/page.js',
    'app/admin/system/workers/page.js',
    'app/admin/tools/page.js',
    'app/admin/users/page.js',
];

const STATIC_RUNTIME_PAGE_FILES = [
    ...PUBLIC_STATIC_RUNTIME_PAGE_FILES,
    ...AGENT_STATIC_RUNTIME_PAGE_FILES,
    ...ADMIN_STATIC_RUNTIME_PAGE_FILES,
];

const STATIC_ROUTE_CONFIG_BY_PATH = new Map(STATIC_ROUTE_SURFACES.map((route) => [route.path, route]));
const EXPLICIT_ROUTE_PREFIXES = ['/admin/', '/api/', '/blog/', '/pages/', '/tools/', '/sitemaps/'];

function normalizeRoutePath(path) {
    const rawPath = typeof path === 'string' ? path.trim() : '';

    if (!rawPath || rawPath === '/') {
        return '/';
    }

    return `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
}

function humanizeSlug(value) {
    return String(value || '')
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function buildOverrideState(override, supportsSeoOverride) {
    if (!override) {
        return 'none';
    }

    return supportsSeoOverride ? 'active' : 'stored_only';
}

function buildEffectiveMetadata(baseMetadata, override) {
    return {
        title: override?.meta_title || baseMetadata.title || null,
        description: override?.meta_description || baseMetadata.description || null,
        canonical_url: override?.canonical_url || baseMetadata.canonical_url || null,
        robots_setting: override?.robots_setting || baseMetadata.robots_setting || null,
        og_image: override?.og_image || null,
    };
}

function isPathShadowed(path, explicitRoutePaths = new Set()) {
    const normalizedPath = normalizeRoutePath(path);

    if (explicitRoutePaths.has(normalizedPath)) {
        return true;
    }

    return EXPLICIT_ROUTE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function buildStaticSurface(definition, override) {
    const mergedDefinition = {
        ...definition,
        ...(override || {}),
    };
    const effectiveMetadata = buildEffectiveMetadata({
        title: mergedDefinition.title,
        description: mergedDefinition.description,
        canonical_url: mergedDefinition.canonical_url || null,
        robots_setting: mergedDefinition.robots_setting || null,
    }, override);
    const overrideState = buildOverrideState(override, mergedDefinition.supports_seo_override);

    return {
        id: `static:${mergedDefinition.path}`,
        path: mergedDefinition.path,
        page_path: mergedDefinition.path,
        title: effectiveMetadata.title,
        desc: effectiveMetadata.description,
        effective_title: effectiveMetadata.title,
        effective_description: effectiveMetadata.description,
        canonical_url: effectiveMetadata.canonical_url,
        robots_setting: effectiveMetadata.robots_setting,
        og_image: effectiveMetadata.og_image || '',
        source_type: mergedDefinition.source_type,
        source_label: mergedDefinition.source_label,
        record_status: mergedDefinition.record_status || 'static',
        metadata_strategy: mergedDefinition.metadata_strategy,
        runtime_live: mergedDefinition.runtime_live !== false,
        supports_seo_override: mergedDefinition.supports_seo_override,
        override_state: overrideState,
        seo_override_active: overrideState === 'active',
        authority_labels: mergedDefinition.authority_labels,
        authority_risk: mergedDefinition.authority_risk,
        boundary_classification: mergedDefinition.boundary_classification || 'PARTIALLY_BOUNDED',
        durability_classification: mergedDefinition.durability_classification || 'PARTIALLY_DURABLE',
        editor_path: mergedDefinition.editor_path || null,
        editor_label: mergedDefinition.editor_label || null,
        note: mergedDefinition.note,
        updated_at: mergedDefinition.updated_at || null,
        runtime_owner_file: mergedDefinition.runtime_owner_file || null,
        visibility_scope: mergedDefinition.visibility_scope || 'public',
        override: override ? { ...override, page_path: override.route_path } : null,
    };
}

function routePathFromPageFile(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const trimmed = normalized.replace(/^app\//, '').replace(/\/page\.js$/, '');
    const segments = trimmed.split('/').filter(Boolean);

    if (segments.length === 0) {
        return '/';
    }

    return normalizeRoutePath(segments.join('/'));
}

function extractMetadataSection(source) {
    const defaultMetadataMatch = String(source || '').match(/const\s+defaultMetadata\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (defaultMetadataMatch?.[1]) {
        return defaultMetadataMatch[1];
    }

    const staticMetadataMatch = String(source || '').match(/export\s+const\s+metadata\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if (staticMetadataMatch?.[1]) {
        return staticMetadataMatch[1];
    }

    return '';
}

function extractMetadataString(section, fieldName) {
    const source = String(section || '');
    const patterns = [
        new RegExp(`${fieldName}\\s*:\\s*'([^']*)'`),
        new RegExp(`${fieldName}\\s*:\\s*"([^"]*)"`),
        new RegExp(`${fieldName}\\s*:\\s*\`([\\s\\S]*?)\``),
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    return null;
}

function inferStaticSource(routePath) {
    if (routePath === '/') {
        return { source_type: 'homepage', source_label: 'Homepage' };
    }

    if (routePath === '/blog') {
        return { source_type: 'blog_index', source_label: 'Blog index' };
    }

    if (routePath === '/resources') {
        return { source_type: 'resource_index', source_label: 'Resource index' };
    }

    if (routePath === '/tools') {
        return { source_type: 'tools_index', source_label: 'Tools index' };
    }

    if (routePath.startsWith('/tools/')) {
        return { source_type: 'tool_page', source_label: 'Tool page' };
    }

    if (routePath.startsWith('/agent/')) {
        return { source_type: 'agent_runtime', source_label: 'Agent runtime' };
    }

    if (routePath.startsWith('/admin')) {
        return { source_type: 'admin_runtime', source_label: 'Admin runtime' };
    }

    return { source_type: 'static_route', source_label: 'Static route' };
}

function buildStaticRouteNote({ routePath, usesSeoHelper, metadataStrategy, hasHybridRuntime, isHiddenRuntime }) {
    if (routePath === '/') {
        return 'Homepage runtime remains file-authoritative while content renders from homepage_sections. Shared SEO helper wiring makes route_path overrides live without changing homepage rendering ownership.';
    }

    if (isHiddenRuntime) {
        if (metadataStrategy === 'layout_inherited') {
            return 'Internal admin runtime route with inherited metadata. Classified for authority continuity, but not exposed as a public SEO ownership surface.';
        }

        return 'Internal admin runtime route with explicit file ownership. Classified for authority continuity, but not exposed as a public SEO ownership surface.';
    }

    if (usesSeoHelper) {
        return 'Explicit App Router page with shared SEO helper wiring. Runtime rendering remains file-authoritative and route_path overrides are live.';
    }

    if (metadataStrategy === 'layout_inherited') {
        return 'Explicit App Router page with inherited layout metadata. Registry-visible for continuity, but there is no dedicated route-level override lane yet.';
    }

    if (hasHybridRuntime) {
        return 'Explicit App Router page with inline route metadata and runtime data dependencies. Registry-visible, but not yet helper-wired for route_path override authority.';
    }

    return 'Explicit App Router page with inline route metadata. Registry-visible, but not yet helper-wired for route_path override authority.';
}

function uniqueLabels(labels) {
    return [...new Set((labels || []).filter(Boolean))];
}

async function describeStaticRuntimeRoute(filePath) {
    const routePath = routePathFromPageFile(filePath);
    const absolutePath = path.join(process.cwd(), filePath.replace(/\//g, path.sep));
    let source = '';

    try {
        source = await fs.readFile(absolutePath, 'utf8');
    } catch {
        source = '';
    }

    const metadataSection = extractMetadataSection(source);
    const usesSeoHelper = source.includes('getSeoMetadata(');
    const exportsGenerateMetadata = /export\s+(async\s+)?function\s+generateMetadata/.test(source);
    const exportsStaticMetadata = /export\s+const\s+metadata\s*=/.test(source);
    const defaultExportAsync = /export\s+default\s+async\s+function/.test(source);
    const usesRuntimeData = /getServiceSupabase\(|\.from\('|await\s+fetch\(/.test(source);
    const hasHybridRuntime = routePath === '/' || defaultExportAsync || usesRuntimeData;
    const metadataStrategy = usesSeoHelper
        ? 'seo_helper'
        : exportsGenerateMetadata
            ? 'dynamic_metadata'
            : exportsStaticMetadata
                ? 'inline_static'
                : 'layout_inherited';
    const isHiddenRuntime = routePath.startsWith('/admin');
    const supportsSeoOverride = usesSeoHelper;
    const title = extractMetadataString(metadataSection, 'title') || humanizeSlug(routePath) || routePath;
    const description = extractMetadataString(metadataSection, 'description') || `Static runtime page at ${routePath}.`;
    const { source_type, source_label } = inferStaticSource(routePath);
    const authorityLabels = uniqueLabels([
        'STATIC_RUNTIME',
        'REGISTRY_VISIBLE',
        'ADMIN_VISIBLE',
        'SEO_AUTHORITATIVE',
        supportsSeoOverride ? 'STATIC_WRAPPED' : null,
        supportsSeoOverride ? 'METADATA_OVERRIDE_CAPABLE' : 'RUNTIME_ONLY',
        supportsSeoOverride ? null : 'PARTIALLY_OPERATIONAL',
        supportsSeoOverride ? null : 'FRAGMENTED',
        hasHybridRuntime ? 'HYBRID_RUNTIME' : null,
        isHiddenRuntime ? 'HIDDEN_RUNTIME' : null,
    ]);

    return {
        path: routePath,
        title,
        description,
        canonical_url: null,
        robots_setting: null,
        source_type,
        source_label,
        record_status: isHiddenRuntime ? 'internal_static' : 'static',
        metadata_strategy: metadataStrategy,
        runtime_live: true,
        supports_seo_override: supportsSeoOverride,
        authority_labels: authorityLabels,
        authority_risk: supportsSeoOverride ? 'SAFE' : 'PARTIALLY_SAFE',
        boundary_classification: supportsSeoOverride ? 'BOUNDED' : 'PARTIALLY_BOUNDED',
        durability_classification: supportsSeoOverride ? 'DURABLE' : 'PARTIALLY_DURABLE',
        editor_path: routePath === '/blog'
            ? '/admin/blog'
            : routePath === '/resources'
                ? '/admin/resources'
                : null,
        editor_label: routePath === '/blog'
            ? 'Open blog manager'
            : routePath === '/resources'
                ? 'Open resources manager'
                : null,
        note: buildStaticRouteNote({ routePath, usesSeoHelper, metadataStrategy, hasHybridRuntime, isHiddenRuntime }),
        runtime_owner_file: filePath,
        visibility_scope: isHiddenRuntime ? 'internal' : (routePath.startsWith('/agent/') ? 'agent' : 'public'),
    };
}

async function discoverStaticRuntimeSurfaces(overridesByPath) {
    const definitions = await Promise.all(STATIC_RUNTIME_PAGE_FILES.map((filePath) => describeStaticRuntimeRoute(filePath)));

    return {
        surfaces: definitions.map((definition) => buildStaticSurface(definition, overridesByPath.get(definition.path))),
        explicitRoutePaths: new Set(definitions.map((definition) => definition.path)),
    };
}

function sortSurfaces(left, right) {
    return left.path.localeCompare(right.path) || left.source_type.localeCompare(right.source_type) || left.id.localeCompare(right.id);
}

// GET: Fetch all SEO overrides
export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const [overridesRes, customPagesRes, pageIndexRes, locationContentRes, draftsRes, blogPostsRes] = await Promise.all([
            supabase
                .from('seo_overrides')
                .select('*')
                .order('route_path', { ascending: true }),
            supabase
                .from('custom_pages')
                .select('id, slug, full_slug, title, meta_title, meta_description, status, page_type, canonical_url, robots_setting, updated_at')
                .order('updated_at', { ascending: false }),
            supabase
                .from('page_index')
                .select('id, page_slug, full_slug, page_type, content_type, status, canonical_url, robots_setting, updated_at')
                .eq('status', 'published')
                .order('updated_at', { ascending: false }),
            supabase
                .from('location_content')
                .select('page_index_id, meta_title, meta_description'),
            supabase
                .from('content_drafts')
                .select('id, slug, full_slug, page_title, meta_title, meta_description, status, page_type, page_index_id, updated_at, published_at')
                .order('updated_at', { ascending: false }),
            supabase
                .from('blog_posts')
                .select('id, slug, title, meta_title, meta_description, status, canonical_url, robots_setting, updated_at, published_at')
                .order('updated_at', { ascending: false }),
        ]);

        if (overridesRes.error) throw overridesRes.error;
        if (customPagesRes.error) throw customPagesRes.error;
        if (pageIndexRes.error) throw pageIndexRes.error;
        if (locationContentRes.error) throw locationContentRes.error;
        if (draftsRes.error) throw draftsRes.error;
        if (blogPostsRes.error) throw blogPostsRes.error;

        const overrides = (overridesRes.data || []).map((override) => ({ ...override, page_path: override.route_path }));
        const overridesByPath = new Map(overrides.map((override) => [normalizeRoutePath(override.route_path), override]));
        const locationContentByPageId = new Map((locationContentRes.data || []).map((content) => [content.page_index_id, content]));
        const draftsByPageIndexId = new Map((draftsRes.data || []).filter((draft) => draft.page_index_id).map((draft) => [draft.page_index_id, draft]));
        const { surfaces: staticSurfaces, explicitRoutePaths } = await discoverStaticRuntimeSurfaces(STATIC_ROUTE_CONFIG_BY_PATH);

        const surfaces = [...staticSurfaces];

        for (const page of customPagesRes.data || []) {
            const runtimePath = normalizeRoutePath(`pages/${page.slug}`);
            const shadowPath = page.full_slug ? normalizeRoutePath(page.full_slug) : null;
            const override = overridesByPath.get(runtimePath);
            const supportsSeoOverride = page.status === 'published';
            const overrideState = buildOverrideState(override, supportsSeoOverride);
            const effectiveMetadata = buildEffectiveMetadata({
                title: page.meta_title || `${page.title} | Bima Sakhi`,
                description: page.meta_description || 'Empowering women via insurance networks.',
                canonical_url: page.canonical_url || `https://bimasakhi.com${runtimePath}`,
                robots_setting: page.robots_setting || null,
            }, override);
            const hasShadowPath = shadowPath && shadowPath !== runtimePath;

            surfaces.push({
                id: `custom:${page.id}`,
                path: runtimePath,
                page_path: runtimePath,
                title: effectiveMetadata.title,
                desc: effectiveMetadata.description,
                effective_title: effectiveMetadata.title,
                effective_description: effectiveMetadata.description,
                canonical_url: effectiveMetadata.canonical_url,
                robots_setting: effectiveMetadata.robots_setting,
                og_image: effectiveMetadata.og_image || '',
                source_type: 'custom_page',
                source_label: 'Custom page',
                record_status: page.status,
                metadata_strategy: 'dynamic_runtime',
                runtime_live: page.status === 'published',
                supports_seo_override: supportsSeoOverride,
                override_state: overrideState,
                seo_override_active: overrideState === 'active',
                authority_labels: hasShadowPath
                    ? ['CRUD_AUTHORITATIVE', 'RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', 'ADMIN_VISIBLE', 'FRAGMENTED']
                    : ['CRUD_AUTHORITATIVE', ...(page.status === 'published' ? ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE'] : []), 'ADMIN_VISIBLE'],
                authority_risk: hasShadowPath ? 'PARTIALLY_SAFE' : 'SAFE',
                boundary_classification: hasShadowPath ? 'PARTIALLY_BOUNDED' : 'BOUNDED',
                durability_classification: hasShadowPath ? 'PARTIALLY_DURABLE' : 'DURABLE',
                editor_path: `/admin/pages/${page.id}`,
                editor_label: 'Open page editor',
                note: hasShadowPath
                    ? `Stable runtime path is ${runtimePath}; shadow root path ${shadowPath} remains feature-flagged and is not treated as canonical authority.`
                    : 'Stable runtime authority remains the legacy /pages/[slug] route.',
                updated_at: page.updated_at || null,
                shadow_path: hasShadowPath ? shadowPath : null,
                runtime_owner_file: 'app/pages/[slug]/page.js',
                visibility_scope: 'public',
                override: override ? { ...override, page_path: override.route_path } : null,
            });
        }

        for (const page of pageIndexRes.data || []) {
            const runtimePath = normalizeRoutePath(page.full_slug || page.page_slug);
            const override = overridesByPath.get(runtimePath);
            const linkedDraft = draftsByPageIndexId.get(page.id) || null;
            const shadowed = isPathShadowed(runtimePath, explicitRoutePaths);
            const supportsSeoOverride = !shadowed && page.status === 'published';
            const overrideState = buildOverrideState(override, supportsSeoOverride);
            const content = locationContentByPageId.get(page.id) || null;
            const effectiveMetadata = buildEffectiveMetadata({
                title: content?.meta_title || `${humanizeSlug(page.full_slug || page.page_slug)} | Bima Sakhi`,
                description: content?.meta_description || 'Bima Sakhi — Women empowerment through financial independence.',
                canonical_url: page.canonical_url || `https://bimasakhi.com${runtimePath}`,
                robots_setting: page.robots_setting || null,
            }, override);

            surfaces.push({
                id: `page_index:${page.id}`,
                path: runtimePath,
                page_path: runtimePath,
                title: effectiveMetadata.title,
                desc: effectiveMetadata.description,
                effective_title: effectiveMetadata.title,
                effective_description: effectiveMetadata.description,
                canonical_url: effectiveMetadata.canonical_url,
                robots_setting: effectiveMetadata.robots_setting,
                og_image: effectiveMetadata.og_image || '',
                source_type: 'page_index',
                source_label: 'Generated page',
                record_status: page.status,
                metadata_strategy: 'dynamic_runtime',
                runtime_live: supportsSeoOverride,
                supports_seo_override: supportsSeoOverride,
                override_state: overrideState,
                seo_override_active: overrideState === 'active',
                authority_labels: shadowed
                    ? ['INDEX_AUTHORITATIVE', 'ADMIN_VISIBLE', 'FRAGMENTED']
                    : ['INDEX_AUTHORITATIVE', 'RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE', ...(linkedDraft ? ['CRUD_AUTHORITATIVE'] : []), 'ADMIN_VISIBLE'],
                authority_risk: shadowed ? 'AUTHORITY_FRAGILE' : 'PARTIALLY_SAFE',
                boundary_classification: shadowed ? 'AUTHORITY_FRAGILE' : 'PARTIALLY_BOUNDED',
                durability_classification: shadowed ? 'AUTHORITY_FRAGILE' : 'PARTIALLY_DURABLE',
                editor_path: linkedDraft ? `/admin/ccc/drafts/${linkedDraft.id}` : '/admin/seo/index',
                editor_label: linkedDraft ? 'Open linked draft' : 'Open index health',
                note: shadowed
                    ? 'An explicit App Router route wins over this catch-all path, so the indexed page is not live at the conflicting runtime path.'
                    : linkedDraft
                        ? 'Catch-all runtime is live; the linked draft remains the authoritative admin editor.'
                        : 'Catch-all runtime is live, but no linked draft record was found in the current admin draft inventory.',
                updated_at: page.updated_at || null,
                runtime_owner_file: 'app/[...slug]/page.js',
                visibility_scope: 'public',
                override: override ? { ...override, page_path: override.route_path } : null,
            });
        }

        for (const post of blogPostsRes.data || []) {
            const runtimePath = normalizeRoutePath(`blog/${post.slug}`);
            const override = overridesByPath.get(runtimePath);
            const supportsSeoOverride = post.status === 'published';
            const overrideState = buildOverrideState(override, supportsSeoOverride);
            const effectiveMetadata = buildEffectiveMetadata({
                title: `${post.meta_title || post.title} | Bima Sakhi`,
                description: post.meta_description || 'Published blog article from Bima Sakhi.',
                canonical_url: post.canonical_url || `https://bimasakhi.com${runtimePath}`,
                robots_setting: post.robots_setting || null,
            }, override);

            surfaces.push({
                id: `blog:${post.id}`,
                path: runtimePath,
                page_path: runtimePath,
                title: effectiveMetadata.title,
                desc: effectiveMetadata.description,
                effective_title: effectiveMetadata.title,
                effective_description: effectiveMetadata.description,
                canonical_url: effectiveMetadata.canonical_url,
                robots_setting: effectiveMetadata.robots_setting,
                og_image: effectiveMetadata.og_image || '',
                source_type: 'blog_post',
                source_label: 'Blog post',
                record_status: post.status,
                metadata_strategy: 'dynamic_runtime',
                runtime_live: post.status === 'published',
                supports_seo_override: supportsSeoOverride,
                override_state: overrideState,
                seo_override_active: overrideState === 'active',
                authority_labels: ['CRUD_AUTHORITATIVE', ...(post.status === 'published' ? ['RUNTIME_AUTHORITATIVE', 'SEO_AUTHORITATIVE'] : []), 'ADMIN_VISIBLE'],
                authority_risk: 'SAFE',
                boundary_classification: 'BOUNDED',
                durability_classification: 'DURABLE',
                editor_path: '/admin/blog',
                editor_label: 'Open blog manager',
                note: 'The explicit /blog/[slug] route is the canonical runtime authority for published blog posts.',
                updated_at: post.updated_at || post.published_at || null,
                runtime_owner_file: 'app/blog/[slug]/page.js',
                visibility_scope: 'public',
                override: override ? { ...override, page_path: override.route_path } : null,
            });
        }

        for (const draft of draftsRes.data || []) {
            if (draft.page_index_id && draft.status === 'published') {
                continue;
            }

            const runtimePath = normalizeRoutePath(draft.full_slug || draft.slug);
            const override = overridesByPath.get(runtimePath);
            const overrideState = buildOverrideState(override, false);
            const effectiveMetadata = buildEffectiveMetadata({
                title: draft.meta_title || draft.page_title || `${humanizeSlug(draft.full_slug || draft.slug)} | Bima Sakhi`,
                description: draft.meta_description || 'Draft content awaiting publish or approval.',
                canonical_url: null,
                robots_setting: null,
            }, override);

            surfaces.push({
                id: `draft:${draft.id}`,
                path: runtimePath,
                page_path: runtimePath,
                title: effectiveMetadata.title,
                desc: effectiveMetadata.description,
                effective_title: effectiveMetadata.title,
                effective_description: effectiveMetadata.description,
                canonical_url: effectiveMetadata.canonical_url,
                robots_setting: effectiveMetadata.robots_setting,
                og_image: effectiveMetadata.og_image || '',
                source_type: 'content_draft',
                source_label: 'Generated draft',
                record_status: draft.status,
                metadata_strategy: 'draft_only',
                runtime_live: false,
                supports_seo_override: false,
                override_state: overrideState,
                seo_override_active: false,
                authority_labels: ['CRUD_AUTHORITATIVE', ...(draft.page_index_id ? ['INDEX_AUTHORITATIVE'] : []), 'ADMIN_VISIBLE'],
                authority_risk: 'PARTIALLY_SAFE',
                boundary_classification: 'PARTIALLY_BOUNDED',
                durability_classification: 'PARTIALLY_DURABLE',
                editor_path: `/admin/ccc/drafts/${draft.id}`,
                editor_label: 'Open draft editor',
                note: draft.page_index_id
                    ? 'Draft remains admin-authoritative; linked runtime/index authority is classified separately when published.'
                    : 'Draft is admin-visible only until publish writes page_index + location_content.',
                updated_at: draft.updated_at || draft.published_at || null,
                runtime_owner_file: null,
                visibility_scope: 'admin',
                override: override ? { ...override, page_path: override.route_path } : null,
            });
        }

        const knownPaths = new Set(surfaces.map((surface) => surface.path));
        for (const override of overrides) {
            const routePath = normalizeRoutePath(override.route_path);
            if (knownPaths.has(routePath)) {
                continue;
            }

            surfaces.push({
                id: `override:${routePath}`,
                path: routePath,
                page_path: routePath,
                title: override.meta_title || humanizeSlug(routePath) || routePath,
                desc: override.meta_description || 'SEO override exists without a currently classified runtime authority surface.',
                effective_title: override.meta_title || humanizeSlug(routePath) || routePath,
                effective_description: override.meta_description || 'SEO override exists without a currently classified runtime authority surface.',
                canonical_url: override.canonical_url || null,
                robots_setting: override.robots_setting || null,
                og_image: override.og_image || '',
                source_type: 'override_only',
                source_label: 'Override only',
                record_status: 'override_only',
                metadata_strategy: 'override_only',
                runtime_live: false,
                supports_seo_override: false,
                override_state: 'stored_only',
                seo_override_active: false,
                authority_labels: ['ADMIN_VISIBLE', 'FRAGMENTED'],
                authority_risk: 'AUTHORITY_FRAGILE',
                boundary_classification: 'AUTHORITY_FRAGILE',
                durability_classification: 'REGISTRY_FRAGILE',
                editor_path: '/admin/seo',
                editor_label: 'Open SEO manager',
                note: 'The override is stored in seo_overrides, but no runtime-authoritative route was classified for this path in the current registry pass.',
                updated_at: override.updated_at || null,
                runtime_owner_file: null,
                visibility_scope: 'registry_only',
                override: { ...override, page_path: override.route_path },
            });
        }

        const sortedSurfaces = surfaces.sort(sortSurfaces);

        return NextResponse.json({
            overrides,
            surfaces: sortedSurfaces,
            summary: {
                total_surfaces: sortedSurfaces.length,
                runtime_live: sortedSurfaces.filter((surface) => surface.runtime_live).length,
                override_capable: sortedSurfaces.filter((surface) => surface.supports_seo_override).length,
                override_active: sortedSurfaces.filter((surface) => surface.seo_override_active).length,
                authority_fragile: sortedSurfaces.filter((surface) => surface.authority_risk === 'AUTHORITY_FRAGILE').length,
                admin_visible: sortedSurfaces.filter((surface) => surface.authority_labels.includes('ADMIN_VISIBLE')).length,
                static_runtime: sortedSurfaces.filter((surface) => surface.authority_labels.includes('STATIC_RUNTIME')).length,
                static_wrapped: sortedSurfaces.filter((surface) => surface.authority_labels.includes('STATIC_WRAPPED')).length,
                hidden_runtime: sortedSurfaces.filter((surface) => surface.authority_labels.includes('HIDDEN_RUNTIME')).length,
                bounded: sortedSurfaces.filter((surface) => surface.boundary_classification === 'BOUNDED').length,
                durable: sortedSurfaces.filter((surface) => surface.durability_classification === 'DURABLE').length,
            },
        });
    } catch (error) {
        console.error('API /admin/seo GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch SEO metadata overrides' }, { status: 500 });
    }
});

// PUT: Upsert an SEO override for a specific page path
export const PUT = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const payload = await request.json();

        const { page_path, meta_title, meta_description, canonical_url, robots_setting, og_image } = payload;
        if (!page_path) return NextResponse.json({ error: 'Missing page_path' }, { status: 400 });

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ page_path, meta_title, meta_description, canonical_url, robots_setting, og_image }))
            .digest('hex');

        const { error } = await supabase.rpc('rule16_upsert_seo_override', {
            p_route_path: page_path,
            p_updates: { meta_title, meta_description, canonical_url, robots_setting, og_image },
            p_idempotency_key: updateKey,
        });

        if (error) throw error;

        const { data, error: refetchErr } = await supabase
            .from('seo_overrides')
            .select('*')
            .eq('route_path', page_path)
            .single();

        if (refetchErr) throw refetchErr;

        return NextResponse.json({ success: true, override: { ...data, page_path: data.route_path } });
    } catch (error) {
        console.error('API /admin/seo PUT error:', error);
        return NextResponse.json({ error: 'Failed to save SEO metadata override' }, { status: 500 });
    }
});
