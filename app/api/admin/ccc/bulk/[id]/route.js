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
import { enqueuePageGeneration } from '@/lib/queue/publisher';

export const dynamic = 'force-dynamic';

function asPromptObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizePromptKeywords(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }

    return [];
}

function normalizePromptInputs(input = {}) {
    const nested = asPromptObject(input.prompt_inputs);
    const templateId = input.prompt_template_id || input.template_id || nested.prompt_template_id || nested.template_id || null;
    const intent = input.intent || input.intent_type || nested.intent || nested.intent_type || input.content_level || 'local_service';
    const location = input.location || nested.location || input.locality_name || input.city_name || input.city || 'your city';
    const keyword = input.keyword || input.keyword_text || nested.keyword || '';
    const keywords = normalizePromptKeywords(input.keywords ?? nested.keywords ?? keyword);

    return {
        role: input.role || nested.role || 'Senior LIC Development Officer and digital content strategist',
        tone: input.tone || nested.tone || 'warm, conversational Hinglish',
        keywords,
        location,
        intent,
        prompt_template_id: templateId,
        template_id: templateId,
        audience: input.audience || nested.audience || 'women aged 25-45 from middle-class families looking for financial independence',
    };
}

function deriveEffectiveStatus(job, queueRow) {
    if (queueRow?.status === 'failed') {
        return 'failed';
    }

    return job.status;
}

function normalizeJobRun(run) {
    return {
        ...run,
        error_message: run?.error_message || run?.error || run?.failure_reason || null,
    };
}

function normalizeDeadLetter(entry) {
    return {
        ...entry,
        error_message: entry?.error || entry?.failure_reason || null,
    };
}

function matchesEventStoreRow(row, jobId, queueId) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const executionContext = row?.execution_context && typeof row.execution_context === 'object'
        ? row.execution_context
        : {};

    return String(payload.bulk_job_id || '') === jobId
        || String(payload.queueId || payload.queue_id || '') === queueId
        || String(executionContext.job_id || '') === jobId
        || String(executionContext.queue_id || '') === queueId;
}

function matchesObservabilityRow(row, jobId, queueId) {
    const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};

    return String(metadata.job_id || '') === jobId
        || String(metadata.queue_id || '') === queueId;
}

async function fetchQueueRow(supabase, queueId) {
    if (!queueId) {
        return null;
    }

    const { data, error } = await supabase
        .from('generation_queue')
        .select('*')
        .eq('id', queueId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

async function fetchJobHistory(supabase, jobId, queueId) {
    const recentDraftsPromise = supabase
        .from('content_drafts')
        .select('id, slug, page_title, status, quality_score, word_count, updated_at, published_at')
        .eq('bulk_job_id', jobId)
        .order('updated_at', { ascending: false })
        .limit(10);

    const queueLogsPromise = queueId
        ? supabase
            .from('generation_logs')
            .select('*')
            .eq('queue_id', queueId)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null });

    const jobRunsPromise = queueId
        ? supabase
            .from('job_runs')
            .select('*')
            .contains('payload', { queue_id: queueId })
            .order('started_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null });

    const observabilityPromise = supabase
        .from('observability_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(120);

    const eventStorePromise = supabase
        .from('event_store')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(120);

    const [recentDraftsRes, queueLogsRes, jobRunsRes, observabilityRes, eventStoreRes] = await Promise.all([
        recentDraftsPromise,
        queueLogsPromise,
        jobRunsPromise,
        observabilityPromise,
        eventStorePromise,
    ]);

    if (recentDraftsRes.error) throw recentDraftsRes.error;
    if (queueLogsRes.error) throw queueLogsRes.error;
    if (jobRunsRes.error) throw jobRunsRes.error;
    if (observabilityRes.error) throw observabilityRes.error;
    if (eventStoreRes.error) throw eventStoreRes.error;

    const normalizedJobRuns = (jobRunsRes.data || []).map(normalizeJobRun);
    const jobRunIds = normalizedJobRuns.map((run) => run.id).filter(Boolean);

    let deadLetters = [];
    if (jobRunIds.length > 0) {
        const { data, error } = await supabase
            .from('job_dead_letters')
            .select('*')
            .in('job_run_id', jobRunIds)
            .order('failed_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        deadLetters = (data || []).map(normalizeDeadLetter);
    }

    return {
        recent_drafts: recentDraftsRes.data || [],
        generation_logs: queueLogsRes.data || [],
        job_runs: normalizedJobRuns,
        dead_letters: deadLetters,
        observability_logs: (observabilityRes.data || []).filter((row) => matchesObservabilityRow(row, jobId, queueId)).slice(0, 20),
        event_store: (eventStoreRes.data || []).filter((row) => matchesEventStoreRow(row, jobId, queueId)).slice(0, 20),
    };
}

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

        const queueRow = await fetchQueueRow(supabase, data.generation_queue_id);

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

        const history = await fetchJobHistory(supabase, id, data.generation_queue_id);
        const failedRuns = history.job_runs.filter((run) => run.status === 'failed');
        const lastFailure = history.dead_letters[0]?.error_message
            || failedRuns[0]?.error_message
            || history.generation_logs.find((entry) => ['dead_lettered', 'retry_scheduled'].includes(entry.event_type))?.message
            || null;

        const effectiveStatus = deriveEffectiveStatus(data, queueRow);

        return NextResponse.json({
            success: true,
            data: {
                ...data,
                effective_status: effectiveStatus,
                draft_stats: stats,
                queue: queueRow,
                targeting_summary: {
                    city_count: Array.isArray(data.city_ids) ? data.city_ids.length : 0,
                    locality_count: Array.isArray(data.locality_ids) ? data.locality_ids.length : 0,
                    pincode_count: Array.isArray(data.pincode_list) ? data.pincode_list.length : 0,
                    queued_pages: Array.isArray(queueRow?.payload?.pages) ? queueRow.payload.pages.length : 0,
                },
                failure_summary: {
                    has_failure: effectiveStatus === 'failed' || history.dead_letters.length > 0 || failedRuns.length > 0,
                    last_error: lastFailure,
                    failed_runs: failedRuns.length,
                    dead_letters: history.dead_letters.length,
                    retry_count: queueRow?.retry_count || 0,
                    can_retry: queueRow?.status === 'failed',
                    can_clear: queueRow?.status === 'failed',
                },
                ...history,
            },
        });
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

        const queueRow = await fetchQueueRow(supabase, job.generation_queue_id);

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

                void supabase.from('observability_logs').insert({
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
                }).then(() => {}).catch(() => {});

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

                if (queueRow && !['completed', 'failed'].includes(queueRow.status)) {
                    await supabase
                        .from('generation_queue')
                        .update({
                            status: 'paused',
                        })
                        .eq('id', queueRow.id)
                        .eq('status', queueRow.status);
                }

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

                let dispatchDeferred = false;
                if (queueRow?.status === 'paused') {
                    await supabase
                        .from('generation_queue')
                        .update({
                            status: 'pending',
                            completed_at: null,
                        })
                        .eq('id', queueRow.id);

                    try {
                        const dispatch = await enqueuePageGeneration({
                            queueId: queueRow.id,
                            source: 'bulk_resume',
                            requested_by: user?.email || 'admin',
                        });
                        dispatchDeferred = !dispatch?.messageId;
                    } catch {
                        dispatchDeferred = true;
                    }
                }

                return NextResponse.json({
                    success: true,
                    message: dispatchDeferred ? 'Job resumed, immediate dispatch deferred' : 'Job resumed',
                    dispatch_deferred: dispatchDeferred,
                });
            }

            case 'cancel': {
                if (['completed', 'cancelled'].includes(job.status)) {
                    return NextResponse.json({ success: false, error: 'Job already finished' }, { status: 400 });
                }

                const now = new Date().toISOString();

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'cancelled',
                        completed_at: now,
                        updated_at: now,
                    })
                    .eq('id', id);

                if (queueRow && queueRow.status !== 'completed') {
                    const totalItems = Math.max(queueRow.total_items || 0, queueRow.progress || 0);

                    await supabase
                        .from('generation_queue')
                        .update({
                            status: 'completed',
                            progress: totalItems,
                            total_items: totalItems,
                            completed_at: now,
                        })
                        .eq('id', queueRow.id);

                    void supabase.from('generation_logs').insert({
                        queue_id: queueRow.id,
                        event_type: 'cancelled',
                        message: `Bulk job cancelled by ${user?.email || 'admin'}`,
                    }).then(() => {}).catch(() => {});
                }

                return NextResponse.json({ success: true, message: 'Job cancelled and remaining queue work stopped' });
            }

            case 'retry_failed': {
                if (!queueRow || queueRow.status !== 'failed') {
                    return NextResponse.json({ success: false, error: 'No failed queue state found for this job' }, { status: 400 });
                }

                await supabase
                    .from('generation_queue')
                    .update({
                        status: 'pending',
                        retry_count: 0,
                        completed_at: null,
                    })
                    .eq('id', queueRow.id);

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        status: 'running',
                        completed_at: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                let dispatchDeferred = false;
                let messageId = null;
                try {
                    const dispatch = await enqueuePageGeneration({
                        queueId: queueRow.id,
                        source: 'bulk_retry',
                        requested_by: user?.email || 'admin',
                    });
                    messageId = dispatch?.messageId || null;
                    dispatchDeferred = !messageId;
                } catch {
                    dispatchDeferred = true;
                }

                void supabase.from('observability_logs').insert({
                    level: 'INFO',
                    message: `Bulk job retry requested for "${job.name}"`,
                    source: 'bulk_planner',
                    metadata: {
                        action: 'retry_failed',
                        job_id: id,
                        queue_id: queueRow.id,
                        dispatch_deferred: dispatchDeferred,
                        requested_by: user?.email || 'admin',
                    },
                }).then(() => {}).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: dispatchDeferred
                        ? 'Failed job reset to pending, immediate dispatch deferred'
                        : 'Failed job reset and dispatched',
                    queue_id: queueRow.id,
                    message_id: messageId,
                    dispatch_deferred: dispatchDeferred,
                });
            }

            case 'clear_failed': {
                if (!queueRow || queueRow.status !== 'failed') {
                    return NextResponse.json({ success: false, error: 'No failed queue state found for this job' }, { status: 400 });
                }

                await supabase
                    .from('bulk_generation_jobs')
                    .update({
                        generation_queue_id: null,
                        status: 'failed',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id);

                const { error: clearError } = await supabase
                    .from('generation_queue')
                    .delete()
                    .eq('id', queueRow.id);

                if (clearError) {
                    return NextResponse.json({ success: false, error: clearError.message }, { status: 500 });
                }

                void supabase.from('observability_logs').insert({
                    level: 'INFO',
                    message: `Bulk job failure artifacts cleared for "${job.name}"`,
                    source: 'bulk_planner',
                    metadata: {
                        action: 'clear_failed',
                        job_id: id,
                        queue_id: queueRow.id,
                        requested_by: user?.email || 'admin',
                    },
                }).then(() => {}).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: 'Failed queue artifacts cleared for this job',
                    cleared_queue_id: queueRow.id,
                });
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

    if (job.locality_ids && job.locality_ids.length > 0) {
        query = query.in('id', job.locality_ids);
    }

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
        .select('page_slug')
        .in('page_slug', slugs.slice(0, 1000)); // Supabase IN limit

    const existingSlugs = new Set((existingPages || []).map((page) => page.page_slug));

    // Build pages list, excluding already-generated
    const pages = [];
    const jobPromptInputs = normalizePromptInputs({
        ...(job.prompt_inputs || {}),
        role: job.prompt_role,
        tone: job.prompt_tone,
        keywords: job.prompt_keywords || job.keyword_variations || job.base_keyword,
        location: job.prompt_location,
        intent: job.prompt_intent || job.intent_type,
        prompt_template_id: job.prompt_template_id,
    });
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
            role: jobPromptInputs.role,
            tone: jobPromptInputs.tone,
            keywords: jobPromptInputs.keywords,
            location: jobPromptInputs.location || loc.locality_name || loc.cities?.city_name || '',
            prompt_template_id: jobPromptInputs.prompt_template_id,
            prompt_inputs: {
                ...jobPromptInputs,
                location: jobPromptInputs.location || loc.locality_name || loc.cities?.city_name || '',
            },
        });
    }

    return pages;
}
