import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

function uniqueIds(ids) {
    return [...new Set((ids || []).filter(Boolean))];
}

const CMS_UUID_FIELDS = new Set(['parent_id', 'prompt_template_id']);
const CMS_DRAFT_FIELDS = ['parent_id', 'full_slug', 'page_type', 'intent_type', 'keywords', 'tone', 'role', 'prompt_template_id'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decorateDraftStructure(draft) {
    if (!draft) return draft;

    return {
        ...draft,
        parent_id: draft.parent_id || null,
        full_slug: draft.full_slug || draft.slug || null,
        page_type: draft.page_type || 'generated_draft',
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

        if (field === 'keywords') {
            updates[field] = value === null || value === '' ? null : value;
            continue;
        }

        updates[field] = value === null ? null : String(value).trim() || null;
    }

    return updates;
}

async function syncPageIndexStatus(supabase, pageIndexIds, status) {
    if (!Array.isArray(pageIndexIds) || pageIndexIds.length === 0) {
        return;
    }

    const { error } = await supabase
        .from('page_index')
        .update({ status, indexing_status: 'blocked', updated_at: new Date().toISOString() })
        .in('id', uniqueIds(pageIndexIds));

    if (error) {
        throw error;
    }
}

// GET /api/admin/ccc/drafts — List drafts with filters
export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status') || '';
        const city = searchParams.get('city') || '';
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const offset = (page - 1) * limit;

        let query = supabase
            .from('content_drafts')
            .select('id, slug, page_title, hero_headline, meta_title, word_count, quality_score, status, review_notes, reviewer, reviewed_at, ai_model, city_id, locality_id, parent_id, full_slug, page_type, intent_type, keywords, tone, role, prompt_template_id, created_at, updated_at, published_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (city) {
            query = query.eq('city_id', city);
        }

        if (search) {
            query = query.or(`slug.ilike.%${search}%,hero_headline.ilike.%${search}%,meta_title.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[CCC Drafts] Query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            drafts: (data || []).map(decorateDraftStructure),
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (err) {
        console.error('[CCC Drafts] API error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

// POST /api/admin/ccc/drafts — Create a blank draft (Fix 2c)
export const POST = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();

        if (body.action === 'bulk_update_status') {
            const ids = uniqueIds(body.ids);
            const nextStatus = String(body.status || '').trim().toLowerCase();

            if (ids.length === 0) {
                return NextResponse.json({ success: false, error: 'Select at least one draft.' }, { status: 400 });
            }

            if (!['draft', 'archived'].includes(nextStatus)) {
                return NextResponse.json({ success: false, error: 'Unsupported bulk status.' }, { status: 400 });
            }

            const { data: drafts, error: fetchError } = await supabase
                .from('content_drafts')
                .select('id, page_index_id, status')
                .in('id', ids);

            if (fetchError) {
                return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
            }

            const eligibleDrafts = (drafts || []).filter((draft) => (
                nextStatus === 'draft' ? draft.status === 'archived' : draft.status !== 'archived'
            ));

            if (eligibleDrafts.length === 0) {
                return NextResponse.json({ success: false, error: 'No eligible drafts found for that bulk action.' }, { status: 400 });
            }

            const pageIndexIds = eligibleDrafts.map((draft) => draft.page_index_id).filter(Boolean);
            await syncPageIndexStatus(supabase, pageIndexIds, nextStatus === 'draft' ? 'unpublished' : 'archived');

            const { error: updateError } = await supabase
                .from('content_drafts')
                .update({
                    status: nextStatus,
                    updated_at: new Date().toISOString(),
                })
                .in('id', eligibleDrafts.map((draft) => draft.id));

            if (updateError) {
                return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                updated: eligibleDrafts.length,
                skipped: ids.length - eligibleDrafts.length,
                status: nextStatus,
            });
        }

        if (body.action === 'bulk_delete_archived') {
            const ids = uniqueIds(body.ids);

            if (ids.length === 0) {
                return NextResponse.json({ success: false, error: 'Select at least one archived draft.' }, { status: 400 });
            }

            const { data: drafts, error: fetchError } = await supabase
                .from('content_drafts')
                .select('id, status')
                .in('id', ids);

            if (fetchError) {
                return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
            }

            const deletableIds = (drafts || []).filter((draft) => draft.status === 'archived').map((draft) => draft.id);

            if (deletableIds.length === 0) {
                return NextResponse.json({ success: false, error: 'Only archived drafts can be deleted.' }, { status: 400 });
            }

            const { error: deleteError } = await supabase
                .from('content_drafts')
                .delete()
                .in('id', deletableIds);

            if (deleteError) {
                return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                deleted: deletableIds.length,
                skipped: ids.length - deletableIds.length,
            });
        }

        if (body.action !== 'create_blank') {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        const slug = `new-page-${Date.now()}`;
        const cmsUpdates = readCmsFieldUpdates(body, CMS_DRAFT_FIELDS);

        const { data, error } = await supabase
            .from('content_drafts')
            .insert({
                slug,
                page_title: 'New Page',
                hero_headline: 'New Page',
                meta_title: '',
                meta_description: '',
                body_content: '',
                status: 'draft',
                word_count: 0,
                ai_model: 'manual',
                ...cmsUpdates,
            })
            .select('id, slug')
            .single();

        if (error) {
            console.error('[CCC Drafts] Create error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, draft: data });
    } catch (err) {
        console.error('[CCC Drafts] POST error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
