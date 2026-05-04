/**
 * /api/admin/ccc/bulk/[id] — Bulk Job Actions
 * 
 * Bible Reference: Phase 4, Section 10-12
 * GET: Get single bulk job details
 * PATCH: Update job (start/pause/resume/cancel)
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { checkSafeMode, isSystemEnabled } from '@/lib/featureFlags';
import { getSystemConfig } from '@/lib/systemConfig';
import { isValidUUID } from '@/lib/observability';
import { dispatchPagegenOutbox } from '@/lib/events/dispatchPagegenOutbox';

export const dynamic = 'force-dynamic';

// GET — Single bulk job with progress
export const GET = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        if (!isValidUUID(id)) {
            return NextResponse.json({ success: false, error: 'Invalid job ID format' }, { status: 400 });
        }
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('bulk_generation_jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        // Get related drafts stats
        const { data: draftStats } = await supabase
            .from('content_drafts')
            .select('status')
            .eq('bulk_job_id', id);

        const stats = {
            draft: 0, approved: 0, rejected: 0, published: 0,
        };
        (draftStats || []).forEach(d => {
            if (stats[d.status] !== undefined) stats[d.status]++;
        });

        return NextResponse.json({ success: true, data: { ...data, draft_stats: stats } });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);

// PATCH — Job actions: start, pause, resume, cancel
export const PATCH = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
        if (!isValidUUID(id)) {
            return NextResponse.json({ success: false, error: 'Invalid job ID format' }, { status: 400 });
        }
        const supabase = getServiceSupabase();
        const { action } = await request.json();

        // Fetch current job
        const { data: job, error: fetchErr } = await supabase
            .from('bulk_generation_jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !job) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        switch (action) {
            case 'start': {
                if (job.status !== 'planned') {
                    return NextResponse.json({ success: false, error: 'Can only start planned jobs' }, { status: 400 });
                }

                // Safety checks
                const safeMode = await checkSafeMode();
                if (safeMode) {
                    return NextResponse.json({ success: false, error: 'System is in safe mode' }, { status: 403 });
                }

                const bulkEnabled = await isSystemEnabled('bulk_generation_enabled');
                if (!bulkEnabled) {
                    return NextResponse.json({ success: false, error: 'Bulk generation is disabled' }, { status: 403 });
                }

                const pagegenEnabled = await isSystemEnabled('pagegen_enabled');
                if (!pagegenEnabled) {
                    return NextResponse.json({ success: false, error: 'Page generation is disabled' }, { status: 403 });
                }

                const systemConfig = await getSystemConfig();
                if (systemConfig.queue_paused) {
                    return NextResponse.json({ success: false, error: 'Queue is paused — job cannot be started until the queue is unpaused in the control panel' }, { status: 403 });
                }

                // Build page list from targeting
                const pages = await buildPageList(supabase, job);

                if (pages.length === 0) {
                    return NextResponse.json({ success: false, error: 'No pages to generate from targeting criteria' }, { status: 400 });
                }

                const startKey = crypto
                    .createHash('sha256')
                    .update(JSON.stringify({ jobId: id, pages }))
                    .digest('hex');

                const { data: startResult, error: startErr } = await supabase.rpc('rule16_start_bulk_generation_job', {
                    p_job_id: id,
                    p_pages: pages,
                    p_actor: user?.email || 'admin',
                    p_idempotency_key: startKey,
                });

                if (startErr) {
                    return NextResponse.json({ success: false, error: `Queue creation failed: ${startErr.message}` }, { status: 500 });
                }

                const dispatchResult = await dispatchPagegenOutbox(
                    startResult.event_store_id,
                    { queueId: startResult.queue_id },
                    { job_id: id, queue_id: startResult.queue_id, source: 'bulk_start' }
                );

                await supabase.from('observability_logs').insert({
                    level: 'INFO',
                    message: `Bulk job started: "${job.name}" — ${pages.length} pages queued`,
                    source: 'bulk_planner',
                    metadata: {
                        job_id: id,
                        queue_id: startResult.queue_id,
                        page_count: pages.length,
                        event_store_id: startResult.event_store_id,
                        dispatch_deferred: !dispatchResult.success,
                    },
                }).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: dispatchResult.success
                        ? `Job started — ${pages.length} pages queued`
                        : `Job started — ${pages.length} pages queued, immediate dispatch deferred to retry daemon`,
                    queue_id: startResult.queue_id,
                    dispatch_deferred: !dispatchResult.success,
                });
            }

            case 'pause': {
                if (job.status !== 'running') {
                    return NextResponse.json({ success: false, error: 'Can only pause running jobs' }, { status: 400 });
                }

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'paused',
                        paused_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                return NextResponse.json({ success: true, message: 'Job paused' });
            }

            case 'resume': {
                if (job.status !== 'paused') {
                    return NextResponse.json({ success: false, error: 'Can only resume paused jobs' }, { status: 400 });
                }

                // Safety checks — same gates as start
                const resumeSafeMode = await checkSafeMode();
                if (resumeSafeMode) {
                    return NextResponse.json({ success: false, error: 'System is in safe mode' }, { status: 403 });
                }

                const resumeBulkEnabled = await isSystemEnabled('bulk_generation_enabled');
                if (!resumeBulkEnabled) {
                    return NextResponse.json({ success: false, error: 'Bulk generation is disabled' }, { status: 403 });
                }

                const resumePagegenEnabled = await isSystemEnabled('pagegen_enabled');
                if (!resumePagegenEnabled) {
                    return NextResponse.json({ success: false, error: 'Page generation is disabled' }, { status: 403 });
                }

                const resumeConfig = await getSystemConfig();
                if (resumeConfig.queue_paused) {
                    return NextResponse.json({ success: false, error: 'Queue is paused — job cannot be resumed until the queue is unpaused in the control panel' }, { status: 403 });
                }

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'running',
                        paused_at: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                return NextResponse.json({ success: true, message: 'Job resumed' });
            }

            case 'cancel': {
                if (['completed', 'cancelled'].includes(job.status)) {
                    return NextResponse.json({ success: false, error: 'Job already finished' }, { status: 400 });
                }

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'cancelled',
                        completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                return NextResponse.json({ success: true, message: 'Job cancelled' });
            }

            default:
                return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);

/**
 * Build page list from bulk job targeting criteria
 * Returns array of { slug, keyword_text, city_name, locality_name } for pagegen
 */
async function buildPageList(supabase, job) {
    let query = supabase
        .from('localities')
        .select('id, locality_name, slug, city_id, cities!inner(city_name, slug)')
        .eq('active', true)
        .order('locality_name');

    if (job.city_ids && job.city_ids.length > 0) {
        query = query.in('city_id', job.city_ids);
    }

    const { data: localities, error } = await query;

    if (error || !localities) return [];

    // Check which pages already exist to avoid duplicates
    const slugs = localities.map(loc => {
        const citySlug = loc.cities?.slug || 'unknown';
        return `bima-sakhi-${citySlug}-${loc.slug}`;
    });

    const { data: existingPages } = await supabase
        .from('page_index')
        .select('slug')
        .in('slug', slugs.slice(0, 1000)); // Supabase IN limit

    const existingSlugs = new Set((existingPages || []).map(p => p.slug));

    // Build pages list, excluding already-generated
    const pages = [];
    for (const loc of localities) {
        const citySlug = loc.cities?.slug || 'unknown';
        const pageSlug = `bima-sakhi-${citySlug}-${loc.slug}`;

        if (existingSlugs.has(pageSlug)) continue;

        const keywordText = job.keyword_variations?.length > 0
            ? `${job.base_keyword} in ${loc.locality_name}`
            : `${job.base_keyword} in ${loc.locality_name}`;

        pages.push({
            slug: pageSlug,
            keyword_text: keywordText,
            city_name: loc.cities?.city_name || '',
            locality_name: loc.locality_name,
            city_id: loc.city_id,
            locality_id: loc.id,
            intent_type: job.intent_type,
            bulk_job_id: job.id,
        });
    }

    return pages;
}
