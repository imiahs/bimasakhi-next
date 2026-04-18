import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/ccc/drafts/[id] — Get single draft with full content
export const GET = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;

        const { data, error } = await supabase
            .from('content_drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, draft: data });
    } catch (err) {
        console.error('[CCC Draft] GET error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});

// PATCH /api/admin/ccc/drafts/[id] — Update draft fields OR approve/reject
export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;
        const body = await request.json();
        const { action, ...fields } = body;

        // Verify draft exists
        const { data: existing, error: fetchErr } = await supabase
            .from('content_drafts')
            .select('id, page_index_id, status, hero_headline, meta_title, meta_description, cta_text, body_content')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

        // Handle approve action
        if (action === 'approve') {
            // Guard: only draft/review can be approved
            if (!['draft', 'review'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot approve a draft with status '${existing.status}'` }, { status: 400 });
            }

            const { error: draftErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'approved',
                    reviewer: user?.id || 'admin',
                    reviewed_at: now,
                    published_at: now,
                    updated_at: now
                })
                .eq('id', id);

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            // Activate the page AND sync latest draft content to live
            if (existing.page_index_id) {
                const { error: pageErr } = await supabase
                    .from('page_index')
                    .update({ status: 'active', updated_at: now })
                    .eq('id', existing.page_index_id);

                if (pageErr) {
                    console.error('[CCC] page_index activation failed:', pageErr);
                }

                // Sync draft content to location_content so live page uses latest edits
                const syncData = {
                    hero_headline: existing.hero_headline || '',
                    meta_title: existing.meta_title || '',
                    meta_description: existing.meta_description || '',
                    cta_text: existing.cta_text || '',
                    updated_at: now
                };
                if (existing.body_content) {
                    syncData.local_opportunity_description = existing.body_content;
                }

                const { error: syncErr } = await supabase
                    .from('location_content')
                    .update(syncData)
                    .eq('page_index_id', existing.page_index_id);

                if (syncErr) {
                    console.error('[CCC] location_content sync on approve failed:', syncErr);
                }
            }

            console.log(`[CCC APPROVED] draftId=${id} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: 'Draft approved — page is now live' });
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

        const allowedFields = ['page_title', 'meta_title', 'meta_description', 'hero_headline', 'body_content', 'faq_data', 'cta_text', 'review_notes', 'status', 'image_prompts', 'featured_image_url'];
        const updates = { updated_at: now };

        for (const key of allowedFields) {
            if (fields[key] !== undefined) {
                updates[key] = fields[key];
            }
        }

        // Sync edits to location_content if content fields changed
        const contentSyncFields = ['hero_headline', 'meta_title', 'meta_description', 'cta_text'];
        const hasContentChanges = contentSyncFields.some(f => fields[f] !== undefined);

        const { error: updateErr } = await supabase
            .from('content_drafts')
            .update(updates)
            .eq('id', id);

        if (updateErr) {
            return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }

        // Sync to location_content so the live page reflects edits
        if (hasContentChanges && existing.page_index_id) {
            const syncData = { updated_at: now };
            if (fields.hero_headline !== undefined) syncData.hero_headline = fields.hero_headline;
            if (fields.meta_title !== undefined) syncData.meta_title = fields.meta_title;
            if (fields.meta_description !== undefined) syncData.meta_description = fields.meta_description;
            if (fields.cta_text !== undefined) syncData.cta_text = fields.cta_text;
            if (fields.body_content !== undefined) syncData.local_opportunity_description = fields.body_content;

            await supabase
                .from('location_content')
                .update(syncData)
                .eq('page_index_id', existing.page_index_id);
        }

        return NextResponse.json({ success: true, message: 'Draft updated' });
    } catch (err) {
        console.error('[CCC Draft] PATCH error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
