import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { invalidateReusablePageRuntime } from '@/lib/cms/reusablePageInvalidation';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

const PAGE_STATUSES = new Set(['draft', 'published', 'archived']);
const CMS_UUID_FIELDS = new Set(['parent_id', 'topic_id', 'category_id']);
const CMS_PAGE_FIELDS = ['parent_id', 'full_slug', 'page_type', 'topic_id', 'category_id', 'canonical_url', 'robots_setting'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

function resolvePageSlug(title, slug) {
    return normalizeSlug(slug || title);
}

function decoratePageStructure(page) {
    if (!page) return page;

    return {
        ...page,
        parent_id: page.parent_id || null,
        full_slug: page.full_slug || page.slug || null,
        page_type: page.page_type || (page.is_campaign_page ? 'campaign_page' : 'custom_page'),
    };
}

function readCmsFieldUpdates(payload, allowedFields) {
    const updates = {};

    for (const field of allowedFields) {
        if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;

        const value = payload[field];
        if (value === undefined) continue;

        if (CMS_UUID_FIELDS.has(field)) {
            if (value === null || String(value).trim() === '') {
                updates[field] = null;
                continue;
            }

            const normalized = String(value).trim();
            if (!UUID_PATTERN.test(normalized)) {
                throw new Error(`${field} must be a UUID or empty.`);
            }
            updates[field] = normalized;
            continue;
        }

        updates[field] = value === null ? null : String(value).trim() || null;
    }

    return updates;
}

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ pages: [] });
        }

        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const status = (searchParams.get('status') || 'all').trim().toLowerCase();
        const type = (searchParams.get('type') || 'all').trim().toLowerCase();
        const search = (searchParams.get('search') || '').trim();
        const page = parsePositiveInt(searchParams.get('page'), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('custom_pages')
            .select(`
                id,
                slug,
                title,
                meta_title,
                meta_description,
                parent_id,
                full_slug,
                page_type,
                topic_id,
                category_id,
                canonical_url,
                robots_setting,
                status,
                is_campaign_page,
                created_at,
                updated_at
            `, { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status !== 'all') {
            if (!PAGE_STATUSES.has(status)) {
                return NextResponse.json({ success: false, error: 'Invalid status filter.' }, { status: 400 });
            }
            query = query.eq('status', status);
        }

        if (type === 'campaign') {
            query = query.eq('is_campaign_page', true);
        } else if (type === 'standard') {
            query = query.eq('is_campaign_page', false);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,meta_title.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            pages: (data || []).map(decoratePageStructure),
            total: count || 0,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
        });
    } catch (err) {
        console.error("Error fetching pages:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch pages." }, { status: 500 });
    }
});

export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey || process.env.SUPABASE_ENABLED !== 'true') {
            return NextResponse.json({ error: 'Supabase required.' }, { status: 400 });
        }

        const reqData = await request.json();
        const { action, title, slug, is_campaign_page, ids, status } = reqData;

        const supabase = getServiceSupabase();

        if (action === 'bulk_update_status') {
            if (!Array.isArray(ids) || ids.length === 0) {
                return NextResponse.json({ success: false, error: 'At least one page is required.' }, { status: 400 });
            }

            if (!PAGE_STATUSES.has(status)) {
                return NextResponse.json({ success: false, error: 'Invalid target status.' }, { status: 400 });
            }

            const uniqueIds = [...new Set(ids.filter(Boolean))];

            const { data: existingPages, error: existingPagesError } = await supabase
                .from('custom_pages')
                .select('id, slug, status')
                .in('id', uniqueIds);

            if (existingPagesError) throw existingPagesError;

            const { data, error } = await supabase
                .from('custom_pages')
                .update({ status, updated_at: new Date().toISOString() })
                .in('id', uniqueIds)
                .select('id, slug, status');

            if (error) throw error;

            const invalidationResults = [];

            for (const updatedPage of data || []) {
                const previousPage = (existingPages || []).find((page) => page.id === updatedPage.id);
                invalidationResults.push(await invalidateReusablePageRuntime({
                    action: 'bulk_update_status',
                    pageId: updatedPage.id,
                    previousSlug: previousPage?.slug,
                    currentSlug: updatedPage.slug,
                    previousStatus: previousPage?.status,
                    currentStatus: updatedPage.status,
                }));
            }

            return NextResponse.json({
                success: true,
                updated: data?.length || 0,
                status,
                invalidation: invalidationResults,
            });
        }

        if (!title) {
            return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
        }

        const resolvedSlug = resolvePageSlug(title, slug);

        if (!resolvedSlug) {
            return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
        }

        const { data: existing } = await supabase.from('custom_pages').select('id').eq('slug', resolvedSlug).maybeSingle();
        if (existing) {
            return NextResponse.json({ success: false, error: 'Slug already exists.' }, { status: 400 });
        }

        const cmsUpdates = readCmsFieldUpdates(reqData, CMS_PAGE_FIELDS);

        const { data, error } = await supabase.from('custom_pages').insert({
            title,
            slug: resolvedSlug,
            is_campaign_page: !!is_campaign_page,
            status: PAGE_STATUSES.has(status) ? status : 'draft',
            ...cmsUpdates,
        }).select().single();

        if (error) throw error;

        const invalidation = await invalidateReusablePageRuntime({
            action: 'create_page',
            pageId: data.id,
            previousSlug: null,
            currentSlug: data.slug,
            previousStatus: null,
            currentStatus: data.status,
        });

        return NextResponse.json({ success: true, page: decoratePageStructure(data), invalidation });
    } catch (err) {
        console.error("Error creating page:", err);
        return NextResponse.json({ success: false, error: "Failed to create page." }, { status: 500 });
    }
});
