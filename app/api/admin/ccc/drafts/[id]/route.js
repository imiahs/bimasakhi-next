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

// ─── PUBLISH HELPER: Creates page_index + location_content for manual drafts ───
async function publishDraftToLive(supabase, draft, now) {
    let pageIndexId = draft.page_index_id;

    // If draft already has a page_index_id, just activate it
    if (pageIndexId) {
        const { error: pageErr } = await supabase
            .from('page_index')
            .update({ status: 'active', updated_at: now })
            .eq('id', pageIndexId);

        if (pageErr) {
            console.error('[CCC Publish] page_index activation failed:', pageErr);
            return { error: pageErr.message };
        }
    } else {
        // Manual draft — no page_index row exists yet
        // Idempotency: check if a page_index row already exists for this slug
        const { data: existingPage } = await supabase
            .from('page_index')
            .select('id')
            .eq('page_slug', draft.slug)
            .maybeSingle();

        if (existingPage) {
            // Page already exists for this slug — reuse it
            pageIndexId = existingPage.id;
            const { error: reactivateErr } = await supabase
                .from('page_index')
                .update({ status: 'active', updated_at: now })
                .eq('id', pageIndexId);

            if (reactivateErr) {
                console.error('[CCC Publish] page_index reactivation failed:', reactivateErr);
                return { error: reactivateErr.message };
            }
        } else {
            // Create new page_index row
            const pageType = inferPageType(draft.slug);
            const { data: newPage, error: createErr } = await supabase
                .from('page_index')
                .insert({
                    page_slug: draft.slug,
                    page_type: pageType,
                    status: 'active',
                    city_id: draft.city_id || null,
                    locality_id: draft.locality_id || null,
                    created_at: now,
                    updated_at: now
                })
                .select('id')
                .single();

            if (createErr) {
                console.error('[CCC Publish] page_index creation failed:', createErr);
                return { error: createErr.message };
            }
            pageIndexId = newPage.id;
        }

        // Link draft to the page_index row
        await supabase
            .from('content_drafts')
            .update({ page_index_id: pageIndexId, updated_at: now })
            .eq('id', draft.id);
    }

    // Sync content to location_content (upsert — create if not exists, update if exists)
    const contentData = {
        page_index_id: pageIndexId,
        hero_headline: draft.hero_headline || '',
        meta_title: draft.meta_title || '',
        meta_description: draft.meta_description || '',
        cta_text: draft.cta_text || '',
        local_opportunity_description: draft.body_content || '',
        faq_data: draft.faq_data || null,
        city_id: draft.city_id || null,
        locality_id: draft.locality_id || null,
        word_count: draft.word_count || 0,
        updated_at: now
    };

    // Check if location_content already exists for this page
    const { data: existingContent } = await supabase
        .from('location_content')
        .select('id')
        .eq('page_index_id', pageIndexId)
        .maybeSingle();

    if (existingContent) {
        const { error: syncErr } = await supabase
            .from('location_content')
            .update(contentData)
            .eq('page_index_id', pageIndexId);

        if (syncErr) {
            console.error('[CCC Publish] location_content update failed:', syncErr);
            return { error: syncErr.message };
        }
    } else {
        // Create new location_content row
        contentData.created_at = now;
        const { error: insertErr } = await supabase
            .from('location_content')
            .insert(contentData);

        if (insertErr) {
            console.error('[CCC Publish] location_content insert failed:', insertErr);
            return { error: insertErr.message };
        }
    }

    return { pageIndexId };
}

// Infer page_type from slug pattern
function inferPageType(slug) {
    if (!slug) return 'custom_page';
    const parts = slug.replace(/^\/+/, '').split(/[/-]/);
    if (slug.startsWith('blog/') || slug.startsWith('blog-')) return 'blog';
    if (slug.startsWith('policy/') || slug.startsWith('policy-')) return 'policy_page';
    if (slug.startsWith('become-lic-agent') || slug.startsWith('career')) return 'career_page';
    if (slug.startsWith('forms/') || slug.startsWith('download')) return 'resource_page';
    // Location-based: lic-agent/city/locality pattern
    if (slug.startsWith('lic-agent')) {
        if (parts.length >= 4) return 'locality_page';
        if (parts.length >= 3) return 'city_page';
        return 'service_page';
    }
    return 'custom_page';
}

// PATCH /api/admin/ccc/drafts/[id] — Update draft fields OR approve/reject/publish/unpublish
export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const supabase = getServiceSupabase();
        const { id } = await params;
        const body = await request.json();
        const { action, ...fields } = body;

        // Verify draft exists (fetch all content fields needed for publish)
        const { data: existing, error: fetchErr } = await supabase
            .from('content_drafts')
            .select('id, page_index_id, status, slug, city_id, locality_id, hero_headline, meta_title, meta_description, cta_text, body_content, faq_data, word_count, featured_image_url, featured_image_alt, scheduled_publish_at')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
        }

        const now = new Date().toISOString();

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

            // Publish: create/activate page_index + sync location_content
            const publishResult = await publishDraftToLive(supabase, existing, now);
            if (publishResult.error) {
                return NextResponse.json({ success: false, error: `Publish failed: ${publishResult.error}` }, { status: 500 });
            }

            // Update draft status to 'published'
            const { error: draftErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'published',
                    page_index_id: publishResult.pageIndexId,
                    reviewer: user?.id || 'admin',
                    reviewed_at: now,
                    published_at: now,
                    updated_at: now
                })
                .eq('id', id);

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            console.log(`[CCC PUBLISHED] draftId=${id} slug=${existing.slug} pageIndexId=${publishResult.pageIndexId} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: `Published — page is live at /${existing.slug}`, pageIndexId: publishResult.pageIndexId });
        }

        // ─── ACTION: UNPUBLISH ───
        if (action === 'unpublish') {
            if (!['published', 'approved'].includes(existing.status)) {
                return NextResponse.json({ success: false, error: `Cannot unpublish a draft with status '${existing.status}'` }, { status: 400 });
            }

            // Deactivate page_index (page returns 404)
            if (existing.page_index_id) {
                const { error: deactivateErr } = await supabase
                    .from('page_index')
                    .update({ status: 'unpublished', updated_at: now })
                    .eq('id', existing.page_index_id);

                if (deactivateErr) {
                    console.error('[CCC Unpublish] page_index deactivation failed:', deactivateErr);
                }
            }

            const { error: draftErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'draft',
                    published_at: null,
                    updated_at: now
                })
                .eq('id', id);

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

            // Deactivate page_index if exists
            if (existing.page_index_id) {
                await supabase
                    .from('page_index')
                    .update({ status: 'archived', updated_at: now })
                    .eq('id', existing.page_index_id);
            }

            const { error: draftErr } = await supabase
                .from('content_drafts')
                .update({
                    status: 'archived',
                    updated_at: now
                })
                .eq('id', id);

            if (draftErr) {
                return NextResponse.json({ success: false, error: draftErr.message }, { status: 500 });
            }

            console.log(`[CCC ARCHIVED] draftId=${id} slug=${existing.slug} reviewer=${user?.id || 'admin'} timestamp=${now}`);
            return NextResponse.json({ success: true, message: 'Draft archived' });
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

        const allowedFields = ['page_title', 'meta_title', 'meta_description', 'hero_headline', 'body_content', 'faq_data', 'cta_text', 'review_notes', 'status', 'image_prompts', 'featured_image_url', 'featured_image_alt'];
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
