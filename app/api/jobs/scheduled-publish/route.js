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
                const publishKey = `scheduled:${draft.id}:${draft.scheduled_publish_at}`;
                const { data: publishResult, error: publishErr } = await supabase.rpc('rule16_publish_draft', {
                    p_draft_id: draft.id,
                    p_actor: 'scheduled_publisher',
                    p_idempotency_key: publishKey,
                });

                if (publishErr) {
                    throw new Error(`publish failed: ${publishErr.message}`);
                }

                published.push({ id: draft.id, slug: draft.slug, pageIndexId: publishResult.page_index_id });
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
