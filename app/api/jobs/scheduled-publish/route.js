import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const maxDuration = 30;

/**
 * SCHEDULED PUBLISHER — Auto-publishes drafts whose scheduled_publish_at has arrived.
 *
 * QStash Schedule:
 *   URL: https://bimasakhi.com/api/jobs/scheduled-publish
 *   Cron: 0 * * * *   (every hour)
 *
 * Logic:
 *   1. Find content_drafts with scheduled_publish_at <= NOW and status in (draft, review)
 *   2. For each: create/activate page_index + location_content, set status=published
 *   3. Log results
 */
async function handler(request) {
    const startTime = Date.now();
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const published = [];
    const errors = [];

    try {
        // Find drafts due for publishing
        const { data: dueDrafts, error: queryErr } = await supabase
            .from('content_drafts')
            .select('id, slug, page_index_id, city_id, locality_id, hero_headline, meta_title, meta_description, cta_text, body_content, faq_data, word_count, status, scheduled_publish_at')
            .not('scheduled_publish_at', 'is', null)
            .lte('scheduled_publish_at', now)
            .in('status', ['draft', 'review'])
            .limit(20);

        if (queryErr) {
            console.error('[ScheduledPublish] Query error:', queryErr.message);
            return NextResponse.json({ error: queryErr.message }, { status: 500 });
        }

        if (!dueDrafts?.length) {
            return NextResponse.json({
                success: true,
                message: 'No drafts due for scheduled publishing',
                duration_ms: Date.now() - startTime
            });
        }

        console.log(`[ScheduledPublish] Found ${dueDrafts.length} draft(s) due for publishing`);

        for (const draft of dueDrafts) {
            try {
                let pageIndexId = draft.page_index_id;

                if (pageIndexId) {
                    // Activate existing page_index
                    await supabase
                        .from('page_index')
                        .update({ status: 'active', updated_at: now })
                        .eq('id', pageIndexId);
                } else {
                    // Check for existing page_index by slug (idempotency)
                    const { data: existingPage } = await supabase
                        .from('page_index')
                        .select('id')
                        .eq('page_slug', draft.slug)
                        .maybeSingle();

                    if (existingPage) {
                        pageIndexId = existingPage.id;
                        await supabase
                            .from('page_index')
                            .update({ status: 'active', updated_at: now })
                            .eq('id', pageIndexId);
                    } else {
                        // Create new page_index
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

                        if (createErr) throw new Error(`page_index create failed: ${createErr.message}`);
                        pageIndexId = newPage.id;
                    }
                }

                // Upsert location_content
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

                const { data: existingContent } = await supabase
                    .from('location_content')
                    .select('id')
                    .eq('page_index_id', pageIndexId)
                    .maybeSingle();

                if (existingContent) {
                    await supabase.from('location_content').update(contentData).eq('page_index_id', pageIndexId);
                } else {
                    contentData.created_at = now;
                    await supabase.from('location_content').insert(contentData);
                }

                // Update draft status
                await supabase
                    .from('content_drafts')
                    .update({
                        status: 'published',
                        page_index_id: pageIndexId,
                        published_at: now,
                        scheduled_publish_at: null,
                        reviewer: 'scheduled_publisher',
                        reviewed_at: now,
                        updated_at: now
                    })
                    .eq('id', draft.id);

                published.push({ id: draft.id, slug: draft.slug, pageIndexId });
                console.log(`[ScheduledPublish] Published: ${draft.slug}`);
            } catch (draftErr) {
                errors.push({ id: draft.id, slug: draft.slug, error: draftErr.message });
                console.error(`[ScheduledPublish] Failed: ${draft.slug}`, draftErr.message);
            }
        }
    } catch (err) {
        console.error('[ScheduledPublish] Fatal error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const result = {
        success: true,
        published: published.length,
        errors: errors.length,
        details: { published, errors },
        duration_ms: Date.now() - startTime
    };

    console.log(`[ScheduledPublish] Complete: ${published.length} published, ${errors.length} errors, ${Date.now() - startTime}ms`);
    return NextResponse.json(result);
}

function inferPageType(slug) {
    if (!slug) return 'custom_page';
    if (slug.startsWith('blog')) return 'blog';
    if (slug.startsWith('policy')) return 'policy_page';
    if (slug.startsWith('become-lic-agent') || slug.startsWith('career')) return 'career_page';
    if (slug.startsWith('forms') || slug.startsWith('download')) return 'resource_page';
    if (slug.startsWith('lic-agent')) {
        const parts = slug.split(/[/-]/);
        if (parts.length >= 4) return 'locality_page';
        if (parts.length >= 3) return 'city_page';
        return 'service_page';
    }
    return 'custom_page';
}

export const POST = verifySignatureAppRouter(handler);
