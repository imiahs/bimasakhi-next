import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

const CMS_UUID_FIELDS = new Set(['parent_id', 'prompt_template_id']);
const CMS_DRAFT_FIELDS = ['parent_id', 'full_slug', 'page_type', 'intent_type', 'keywords', 'tone', 'role', 'prompt_template_id'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-/]+|[-/]+$/g, '');
}

function isVersionHistoryUnavailable(error) {
    return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || error?.message?.includes('content_version_history');
}

function buildDraftActionKey({ draftId, action, status, updatedAt }) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify({
            draftId,
            action,
            status: status || null,
            updatedAt: updatedAt || null,
        }))
        .digest('hex');
}

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

// GET /api/admin/ccc/drafts/[id] — Get single draft with full content
export const GET = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const versionId = searchParams.get('versionId');

        const { data, error } = await supabase
            .from('content_drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        let versions = [];

        const { data: versionsData, error: versionsError } = await supabase
            .from('content_version_history')
            .select('id, version_number, saved_by, change_summary, created_at')
            .eq('draft_id', id)
            .order('version_number', { ascending: false });

        if (versionsError) {
            if (!isVersionHistoryUnavailable(versionsError)) {
                throw versionsError;
            }
        } else {
            versions = versionsData || [];
        }

        let selectedVersion = null;
        if (versionId) {
            const { data: versionData, error: versionError } = await supabase
                .from('content_version_history')
                .select('id, version_number, saved_by, change_summary, created_at, snapshot')
                .eq('id', versionId)
                .eq('draft_id', id)
                .single();

            if (versionError) {
                if (isVersionHistoryUnavailable(versionError)) {
                    return NextResponse.json({ success: false, error: 'Version history is not available yet' }, { status: 503 });
                }
                return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
            }

            selectedVersion = versionData;
        }

        return NextResponse.json({ success: true, draft: decorateDraftStructure(data), versions: versions || [], selectedVersion });
    } catch (err) {
        console.error('[CCC Draft] GET error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

// PATCH /api/admin/ccc/drafts/[id] — Update draft fields OR approve/reject/publish/unpublish
export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;
        const body = await request.json();
        const { action, change_summary, version_id, ...fields } = body;

        // Verify draft exists (fetch all content fields needed for publish)
        const { data: existing, error: fetchErr } = await supabase
            .from('content_drafts')
            .select('id, page_index_id, status, slug, city_id, locality_id, hero_headline, meta_title, meta_description, cta_text, body_content, faq_data, word_count, featured_image_url, featured_image_alt, scheduled_publish_at, updated_at')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

        if (action === 'restore') {
            if (existing.status !== 'archived') {
                return NextResponse.json({ success: false, error: `Cannot restore a draft with status '${existing.status}'` }, { status: 400 });
            }

            if (existing.page_index_id) {
                const { error: pageIndexError } = await supabase
                    .from('page_index')
                    .update({ status: 'unpublished', indexing_status: 'blocked', updated_at: now })
                    .eq('id', existing.page_index_id);

                if (pageIndexError) {
                    return NextResponse.json({ success: false, error: pageIndexError.message }, { status: 500 });
                }
            }

            const { error: restoreError } = await supabase
                .from('content_drafts')
                .update({ status: 'draft', updated_at: now, reviewed_at: now, reviewer: user?.email || user?.id || 'admin' })
                .eq('id', id);

            if (restoreError) {
                return NextResponse.json({ success: false, error: restoreError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Draft restored to draft status' });
        }

        // ─── ACTION: APPROVE & PUBLISH ───
        if (action === 'approve') {
            // Guard: only draft/review can be approved
            if (!['draft', 'review'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot approve a draft with status '${existing.status}'` }, { status: 400 });
            }

            // Validate: slug is required for publishing
            if (!existing.slug) {
                return NextResponse.json({ success: false, error: 'Draft has no slug — cannot publish without a URL' }, { status: 400 });
            }

            const publishKey = buildDraftActionKey({
                draftId: id,
                action: 'approve',
                status: existing.status,
                updatedAt: existing.updated_at,
            });
            const { data: publishResult, error: publishErr } = await supabase.rpc('rule16_publish_draft', {
                p_draft_id: id,
                p_actor: user?.email || user?.id || 'admin',
                p_idempotency_key: publishKey,
            });

            if (publishErr) {
                return NextResponse.json({ success: false, error: `Publish failed: ${publishErr.message}` }, { status: 500 });
            }

            console.log(`[CCC PUBLISHED] draftId=${id} slug=${existing.slug} pageIndexId=${publishResult.page_index_id} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: `Published — page is live at /${existing.slug}`, pageIndexId: publishResult.page_index_id });
        }

        // ─── ACTION: UNPUBLISH ───
        if (action === 'unpublish') {
            if (!['published', 'approved'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot unpublish a draft with status '${existing.status}'` }, { status: 400 });
            }

            const transitionKey = buildDraftActionKey({
                draftId: id,
                action: 'unpublish',
                status: existing.status,
                updatedAt: existing.updated_at,
            });

            const { error: draftErr } = await supabase.rpc('rule16_transition_draft_status', {
                p_draft_id: id,
                p_action: 'unpublish',
                p_actor: user?.email || user?.id || 'admin',
                p_idempotency_key: transitionKey,
            });

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            console.log(`[CCC UNPUBLISHED] draftId=${id} slug=${existing.slug} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: `Unpublished — /${existing.slug} is now offline` });
        }

        // ─── ACTION: ARCHIVE ───
        if (action === 'archive') {
            if (existing.status === 'archived') {
                return NextResponse.json({ success: false, error: 'Draft is already archived' }, { status: 400 });
            }

            const transitionKey = buildDraftActionKey({
                draftId: id,
                action: 'archive',
                status: existing.status,
                updatedAt: existing.updated_at,
            });

            const { error: draftErr } = await supabase.rpc('rule16_transition_draft_status', {
                p_draft_id: id,
                p_action: 'archive',
                p_actor: user?.email || user?.id || 'admin',
                p_idempotency_key: transitionKey,
            });

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            console.log(`[CCC ARCHIVED] draftId=${id} slug=${existing.slug} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: 'Draft archived' });
        }

        // ─── ACTION: RESTORE VERSION ───
        if (action === 'restore_version') {
            if (!['draft', 'review'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot restore a draft with status '${existing.status}'` }, { status: 400 });
            }

            if (!version_id) {
                return NextResponse.json({ success: false, error: 'version_id is required' }, { status: 400 });
            }

            const { data: versionRow, error: versionError } = await supabase
                .from('content_version_history')
                .select('id, version_number, snapshot')
                .eq('id', version_id)
                .eq('draft_id', id)
                .single();

            if (versionError || !versionRow) {
                if (isVersionHistoryUnavailable(versionError)) {
                    return NextResponse.json({ success: false, error: 'Version history is not available yet' }, { status: 503 });
                }
                return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
            }

            const snapshot = versionRow.snapshot || {};
            const restoreUpdates = {
                page_title: snapshot.page_title,
                meta_title: snapshot.meta_title,
                meta_description: snapshot.meta_description,
                hero_headline: snapshot.hero_headline,
                body_content: snapshot.body_content,
                faq_data: snapshot.faq_data,
                cta_text: snapshot.cta_text,
                review_notes: snapshot.review_notes,
                status: snapshot.status,
                image_prompts: snapshot.image_prompts,
                featured_image_url: snapshot.featured_image_url,
                featured_image_alt: snapshot.featured_image_alt,
                __saved_by: user?.email || user?.id || 'admin',
                __change_summary: change_summary || `Restored version ${versionRow.version_number}`,
                updated_at: now,
            };

            const restoreKey = crypto
                .createHash('sha256')
                .update(JSON.stringify({ draftId: id, action: 'restore_version', versionId: version_id, restoreUpdates }))
                .digest('hex');

            const { error: restoreError } = await supabase.rpc('rule16_update_content_draft', {
                p_draft_id: id,
                p_updates: restoreUpdates,
                p_idempotency_key: restoreKey,
            });

            if (restoreError) {
                return NextResponse.json({ success: false, error: restoreError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: `Restored version ${versionRow.version_number}` });
        }

        // ─── ACTION: SCHEDULE ───
        if (action === 'schedule') {
            if (!['draft', 'review'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot schedule a draft with status '${existing.status}'` }, { status: 400 });
            }

            const scheduledAt = fields.scheduled_publish_at;
            if (!scheduledAt) {
                return NextResponse.json({ success: false, error: 'scheduled_publish_at is required' }, { status: 400 });
            }

            // Validate the date is in the future
            if (new Date(scheduledAt) <= new Date()) {
                return NextResponse.json({ success: false, error: 'Scheduled time must be in the future' }, { status: 400 });
            }

            const { error: schedErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'review',
                    scheduled_publish_at: scheduledAt,
                    updated_at: now
                })
                .eq('id', id);

            if (schedErr) {
                return NextResponse.json({ success: false, error: schedErr.message }, { status: 500 });
            }

            console.log(`[CCC SCHEDULED] draftId=${id} slug=${existing.slug} scheduledAt=${scheduledAt} timestamp=${now}`);
            return NextResponse.json({ success: true, message: `Scheduled for ${new Date(scheduledAt).toLocaleString('en-IN')}` });
        }

        // Handle reject action
        if (action === 'reject') {
            // Guard: only draft/review can be rejected
            if (!['draft', 'review'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot reject a draft with status '${existing.status}'` }, { status: 400 });
            }

            const { error: draftErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'rejected',
                    review_notes: fields.review_notes || '',
                    reviewer: user?.id || 'admin',
                    reviewed_at: now,
                    updated_at: now
                })
                .eq('id', id);

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            console.log(`[CCC REJECTED] draftId=${id} reviewer=${user?.id || 'admin'} reason="${fields.review_notes || ''}" timestamp=${now}`);
            return NextResponse.json({ success: true, message: 'Draft rejected' });
        }

        // Handle generic field updates (edit mode)
        // Guard: only draft/review status drafts are editable
        if (!['draft', 'review'].includes(existing.status)) {
            return NextResponse.json({ success: false, error: `Cannot edit a draft with status '${existing.status}'` }, { status: 400 });
        }

        let nextSlug = null;
        if (fields.slug !== undefined) {
            nextSlug = normalizeSlug(fields.slug);

            if (!nextSlug) {
                return NextResponse.json({ success: false, error: 'Slug is required.' }, { status: 400 });
            }

            const { data: duplicateDraft, error: duplicateDraftError } = await supabase
                .from('content_drafts')
                .select('id')
                .eq('slug', nextSlug)
                .neq('id', id)
                .maybeSingle();

            if (duplicateDraftError) {
                return NextResponse.json({ success: false, error: duplicateDraftError.message }, { status: 500 });
            }

            if (duplicateDraft) {
                return NextResponse.json({ success: false, error: 'Slug already exists on another draft.' }, { status: 400 });
            }

            const pageIndexQuery = supabase
                .from('page_index')
                .select('id')
                .eq('page_slug', nextSlug);

            const { data: duplicatePageIndex, error: duplicatePageIndexError } = existing.page_index_id
                ? await pageIndexQuery.neq('id', existing.page_index_id).maybeSingle()
                : await pageIndexQuery.maybeSingle();

            if (duplicatePageIndexError) {
                return NextResponse.json({ success: false, error: duplicatePageIndexError.message }, { status: 500 });
            }

            if (duplicatePageIndex) {
                return NextResponse.json({ success: false, error: 'Slug already exists on a published page.' }, { status: 400 });
            }
        }

        const allowedFields = ['page_title', 'meta_title', 'meta_description', 'hero_headline', 'body_content', 'faq_data', 'cta_text', 'review_notes', 'status', 'image_prompts', 'featured_image_url', 'featured_image_alt', ...CMS_DRAFT_FIELDS];
        const updates = {
            updated_at: now,
            __saved_by: user?.email || user?.id || 'admin',
            __change_summary: change_summary || null,
        };

        for (const key of allowedFields) {
            if (fields[key] !== undefined) {
                updates[key] = fields[key];
            }
        }

        Object.assign(updates, readCmsFieldUpdates(fields, CMS_DRAFT_FIELDS));

        const updateKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ draftId: id, updates, changeSummary: change_summary || null }))
            .digest('hex');

        const { error: updateErr } = await supabase.rpc('rule16_update_content_draft', {
            p_draft_id: id,
            p_updates: updates,
            p_idempotency_key: updateKey,
        });

        if (updateErr) {
            return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }

        if (nextSlug && nextSlug !== existing.slug) {
            const { error: slugUpdateError } = await supabase
                .from('content_drafts')
                .update({ slug: nextSlug, updated_at: now })
                .eq('id', id);

            if (slugUpdateError) {
                return NextResponse.json({ success: false, error: slugUpdateError.message }, { status: 500 });
            }

            if (existing.page_index_id) {
                const { error: pageIndexUpdateError } = await supabase
                    .from('page_index')
                    .update({ page_slug: nextSlug, updated_at: now })
                    .eq('id', existing.page_index_id);

                if (pageIndexUpdateError) {
                    return NextResponse.json({ success: false, error: pageIndexUpdateError.message }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Draft updated' });
    } catch (err) {
        console.error('[CCC Draft] PATCH error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

export const DELETE = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;
        const now = new Date().toISOString();

        const { data: existing, error: fetchErr } = await supabase
            .from('content_drafts')
            .select('id, status')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        if (existing.status !== 'archived') {
            return NextResponse.json({ success: false, error: 'Only archived drafts can be deleted.' }, { status: 400 });
        }

        const { data: updatedDraft, error: updateError } = await supabase
            .from('content_drafts')
            .update({
                status: 'archived',
                updated_at: now,
                reviewed_at: now,
                reviewer: user?.email || user?.id || 'admin',
            })
            .eq('id', id)
            .select('id, status, updated_at')
            .single();

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, soft_deleted: true, draft: updatedDraft });
    } catch (err) {
        console.error('[CCC Draft] DELETE error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
