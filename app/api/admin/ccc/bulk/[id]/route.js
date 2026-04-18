/**
 * /api/admin/ccc/bulk/[id] — Bulk Job Actions
 * 
 * Bible Reference: Phase 4, Section 10-12
 * GET: Get single bulk job details
 * PATCH: Update job (start/pause/resume/cancel)
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { enqueuePageGeneration } from '@/lib/queue/publisher';
import { checkSafeMode, isSystemEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

// GET — Single bulk job with progress
export const GET = withAdminAuth(async (request, user, { params }) => {
    try {
        const { id } = await params;
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

                // Build page list from targeting
                const pages = await buildPageList(supabase, job);

                if (pages.length === 0) {
                    return NextResponse.json({ success: false, error: 'No pages to generate from targeting criteria' }, { status: 400 });
                }

                // Create generation_queue entry with page list
                const { data: queueEntry, error: queueErr } = await supabase
                    .from('generation_queue')
                    .insert({
                        task_type: 'pagegen',
                        payload: {
                            pages,
                            bulk_job_id: id,
                            base_keyword: job.base_keyword,
                            intent_type: job.intent_type,
                        },
                        status: 'pending',
                        total_items: pages.length,
                        progress: 0,
                        priority: 1,
                        created_by: user?.email || 'admin',
                    })
                    .select('id')
                    .single();

                if (queueErr) {
                    return NextResponse.json({ success: false, error: `Queue creation failed: ${queueErr.message}` }, { status: 500 });
                }

                // Update bulk job status
                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'running',
                        total_pages: pages.length,
                        started_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                // Dispatch first page via QStash
                await enqueuePageGeneration({ queueId: queueEntry.id });

                await supabase.from('observability_logs').insert({
                    level: 'INFO',
                    message: `Bulk job started: "${job.name}" — ${pages.length} pages queued`,
                    source: 'bulk_planner',
                    metadata: { job_id: id, queue_id: queueEntry.id, page_count: pages.length },
                }).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: `Job started — ${pages.length} pages queued`,
                    queue_id: queueEntry.id,
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
