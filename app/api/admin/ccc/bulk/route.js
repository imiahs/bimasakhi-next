/**
 * /api/admin/ccc/bulk — Bulk Job Planner CRUD
 * 
 * Bible Reference: Phase 4, Section 10-12
 * GET: List all bulk generation jobs
 * POST: Create a new bulk generation job
 */
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { validateUUIDArray } from '@/lib/observability';
import { enqueuePageGeneration } from '@/lib/queue/publisher';

export const dynamic = 'force-dynamic';

const BULK_JOB_STATUSES = new Set(['planned', 'running', 'paused', 'completed', 'failed', 'cancelled']);

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

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateFilter(value, mode = 'start') {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    if (mode === 'end') {
        parsed.setHours(23, 59, 59, 999);
    } else {
        parsed.setHours(0, 0, 0, 0);
    }

    return parsed.toISOString();
}

function buildQueueLookupMap(queueRows) {
    return new Map((queueRows || []).map((row) => [row.id, row]));
}

function deriveEffectiveStatus(job, queueRow) {
    if (queueRow?.status === 'failed') {
        return 'failed';
    }

    return job.status;
}

function enrichJob(job, queueRow) {
    const effectiveStatus = deriveEffectiveStatus(job, queueRow);
    const queuePayload = queueRow?.payload && typeof queueRow.payload === 'object'
        ? queueRow.payload
        : {};

    return {
        ...job,
        effective_status: effectiveStatus,
        queue_status: queueRow?.status || null,
        queue_progress: queueRow?.progress ?? null,
        queue_total_items: queueRow?.total_items ?? null,
        queue_retry_count: queueRow?.retry_count ?? 0,
        queue_created_at: queueRow?.created_at || null,
        queue_completed_at: queueRow?.completed_at || null,
        queued_pages: Array.isArray(queuePayload.pages) ? queuePayload.pages.length : 0,
        has_failed_queue: queueRow?.status === 'failed',
    };
}

async function fetchQueueRowsByIds(supabase, queueIds) {
    if (!queueIds.length) {
        return [];
    }

    const { data, error } = await supabase
        .from('generation_queue')
        .select('id, status, progress, total_items, retry_count, completed_at, created_at, payload')
        .in('id', queueIds);

    if (error) {
        throw error;
    }

    return data || [];
}

async function fetchFailedBulkTargets(supabase, targetJobId = null) {
    let jobsQuery = supabase
        .from('bulk_generation_jobs')
        .select('id, name, generation_queue_id')
        .not('generation_queue_id', 'is', null);

    if (targetJobId) {
        jobsQuery = jobsQuery.eq('id', targetJobId);
    }

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) {
        throw jobsError;
    }

    const queueIds = (jobs || [])
        .map((job) => job.generation_queue_id)
        .filter(Boolean);

    if (queueIds.length === 0) {
        return { jobs: [], queues: [] };
    }

    const { data: queues, error: queueError } = await supabase
        .from('generation_queue')
        .select('id, status, retry_count, max_retries, payload, completed_at')
        .in('id', queueIds)
        .eq('status', 'failed');

    if (queueError) {
        throw queueError;
    }

    const failedQueueIds = new Set((queues || []).map((queue) => queue.id));

    return {
        jobs: (jobs || []).filter((job) => failedQueueIds.has(job.generation_queue_id)),
        queues: queues || [],
    };
}

// GET — List bulk jobs with stats
export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();
        const { searchParams } = new URL(request.url);
        const status = (searchParams.get('status') || 'all').trim().toLowerCase();
        const search = (searchParams.get('search') || '').trim();
        const page = parsePositiveInt(searchParams.get('page'), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 10), 100);
        const createdFrom = parseDateFilter(searchParams.get('created_from'), 'start');
        const createdTo = parseDateFilter(searchParams.get('created_to'), 'end');
        if (status !== 'all' && !BULK_JOB_STATUSES.has(status)) {
            return NextResponse.json({ success: false, error: 'Invalid bulk job status filter' }, { status: 400 });
        }

        let query = supabase
            .from('bulk_generation_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,base_keyword.ilike.%${search}%`);
        }

        if (createdFrom) {
            query = query.gte('created_at', createdFrom);
        }

        if (createdTo) {
            query = query.lte('created_at', createdTo);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const queueIds = (data || [])
            .map((job) => job.generation_queue_id)
            .filter(Boolean);

        const queueMap = buildQueueLookupMap(await fetchQueueRowsByIds(supabase, queueIds));
        const allJobs = (data || []).map((job) => enrichJob(job, queueMap.get(job.generation_queue_id)));
        const filteredJobs = status === 'all'
            ? allJobs
            : allJobs.filter((job) => job.effective_status === status);

        const total = filteredJobs.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const offset = (safePage - 1) * limit;
        const enrichedJobs = filteredJobs.slice(offset, offset + limit);

        const summary = {
            total_jobs: total,
            page_jobs: enrichedJobs.length,
            running_jobs: enrichedJobs.filter((job) => job.effective_status === 'running').length,
            planned_jobs: enrichedJobs.filter((job) => job.effective_status === 'planned').length,
            paused_jobs: enrichedJobs.filter((job) => job.effective_status === 'paused').length,
            completed_jobs: enrichedJobs.filter((job) => job.effective_status === 'completed').length,
            failed_jobs: enrichedJobs.filter((job) => job.effective_status === 'failed').length,
        };

        return NextResponse.json({
            success: true,
            data: enrichedJobs,
            total,
            page: safePage,
            limit,
            totalPages,
            summary,
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin', 'editor']);

// PATCH — Retry or clear failed queue-linked bulk jobs
export const PATCH = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();
        const { action, id } = body || {};
        const targetId = typeof id === 'string' && id.trim() ? id.trim() : null;

        if (targetId) {
            const validation = validateUUIDArray([targetId]);
            if (!validation.valid) {
                return NextResponse.json({ success: false, error: `Invalid bulk job id: ${validation.invalid.join(', ')}` }, { status: 400 });
            }
        }

        if (!['retry_failed', 'clear_failed'].includes(action)) {
            return NextResponse.json({ success: false, error: 'Unknown action. Valid actions: retry_failed, clear_failed' }, { status: 400 });
        }

        const { jobs, queues } = await fetchFailedBulkTargets(supabase, targetId);
        if (jobs.length === 0 || queues.length === 0) {
            return NextResponse.json({ success: false, error: 'No failed bulk jobs found for the requested action' }, { status: 404 });
        }

        const queueIds = queues.map((queue) => queue.id);
        const jobIds = jobs.map((job) => job.id);
        const now = new Date().toISOString();

        if (action === 'retry_failed') {
            const { error: queueError } = await supabase
                .from('generation_queue')
                .update({
                    status: 'pending',
                    retry_count: 0,
                    completed_at: null,
                })
                .in('id', queueIds);

            if (queueError) {
                return NextResponse.json({ success: false, error: queueError.message }, { status: 500 });
            }

            const { error: jobError } = await supabase
                .from('bulk_generation_jobs')
                .update({
                    status: 'running',
                    completed_at: null,
                    updated_at: now,
                })
                .in('id', jobIds);

            if (jobError) {
                return NextResponse.json({ success: false, error: jobError.message }, { status: 500 });
            }

            const dispatchResults = await Promise.allSettled(
                queueIds.map((queueId) => enqueuePageGeneration({
                    queueId,
                    source: 'bulk_retry',
                    requested_by: user?.email || 'admin',
                }))
            );

            const dispatched = dispatchResults.filter((result) => result.status === 'fulfilled' && result.value?.messageId).length;

            void supabase.from('observability_logs').insert({
                level: 'INFO',
                message: `Bulk planner retried ${jobs.length} failed job(s)` ,
                source: 'bulk_planner',
                metadata: {
                    action: 'retry_failed',
                    job_ids: jobIds,
                    queue_ids: queueIds,
                    dispatched,
                    requested_by: user?.email || 'admin',
                },
            }).then(() => {}).catch(() => {});

            return NextResponse.json({
                success: true,
                action,
                retried_jobs: jobs.length,
                queue_rows: queueIds.length,
                dispatched,
                dispatch_deferred: dispatched !== queueIds.length,
            });
        }

        const { error: detachError } = await supabase
            .from('bulk_generation_jobs')
            .update({
                generation_queue_id: null,
                status: 'failed',
                updated_at: now,
            })
            .in('id', jobIds);

        if (detachError) {
            return NextResponse.json({ success: false, error: detachError.message }, { status: 500 });
        }

        const { error: clearError } = await supabase
            .from('generation_queue')
            .delete()
            .in('id', queueIds);

        if (clearError) {
            return NextResponse.json({ success: false, error: clearError.message }, { status: 500 });
        }

        void supabase.from('observability_logs').insert({
            level: 'INFO',
            message: `Bulk planner cleared ${jobs.length} failed queue artifact(s)`,
            source: 'bulk_planner',
            metadata: {
                action: 'clear_failed',
                job_ids: jobIds,
                queue_ids: queueIds,
                requested_by: user?.email || 'admin',
            },
        }).then(() => {}).catch(() => {});

        return NextResponse.json({
            success: true,
            action,
            cleared_jobs: jobs.length,
            cleared_queue_rows: queueIds.length,
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);

// POST — Create a new bulk generation job
export const POST = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();

        const {
            name,
            description,
            intent_type,
            scope,
            city_ids,
            locality_ids,
            base_keyword,
            keyword_variations,
            content_type,
            auto_approve_threshold,
            require_review_below,
            daily_publish_limit,
            generation_per_hour_cap,
        } = body;

        // Validate required fields
        if (!name || !intent_type || !base_keyword) {
            return NextResponse.json(
                { success: false, error: 'name, intent_type, and base_keyword are required' },
                { status: 400 }
            );
        }

        // Validate UUID arrays before DB queries (Stabilization: 400 not 500)
        const selectedCityIds = Array.isArray(city_ids) ? city_ids : [];
        const selectedLocalityIds = Array.isArray(locality_ids) ? locality_ids : [];

        if (selectedCityIds.length > 0) {
            const cityValidation = validateUUIDArray(selectedCityIds);
            if (!cityValidation.valid) {
                return NextResponse.json(
                    { success: false, error: `Invalid city_ids: ${cityValidation.invalid.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        if (selectedLocalityIds.length > 0) {
            const localityValidation = validateUUIDArray(selectedLocalityIds);
            if (!localityValidation.valid) {
                return NextResponse.json(
                    { success: false, error: `Invalid locality_ids: ${localityValidation.invalid.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        // Calculate total pages based on targeting
        let totalPages = 0;

        if (selectedLocalityIds.length > 0) {
            // Specific localities selected — count those
            totalPages = selectedLocalityIds.length;
        } else if (selectedCityIds.length > 0) {
            // Count localities in selected cities
            const { count } = await supabase
                .from('localities')
                .select('*', { count: 'exact', head: true })
                .in('city_id', selectedCityIds)
                .eq('active', true);
            totalPages = count || 0;
        } else {
            // All active localities
            const { count } = await supabase
                .from('localities')
                .select('*', { count: 'exact', head: true })
                .eq('active', true);
            totalPages = count || 0;
        }

        const promptInputs = normalizePromptInputs({
            role: body.role,
            tone: body.tone,
            keywords: body.keywords || body.prompt_keywords || keyword_variations || base_keyword,
            location: body.location || body.prompt_location,
            intent: body.intent || intent_type,
            prompt_template_id: body.prompt_template_id || body.template_id,
        });

        const insertPayload = {
            name,
            description: description || null,
            intent_type,
            scope: scope || 'locality',
            city_ids: selectedCityIds,
            locality_ids: selectedLocalityIds,
            base_keyword,
            keyword_variations: keyword_variations || [],
            content_type: content_type || 'local_service',
            auto_approve_threshold: auto_approve_threshold ?? 8.0,
            require_review_below: require_review_below ?? 6.0,
            daily_publish_limit: Math.min(daily_publish_limit || 20, 100),
            generation_per_hour_cap: Math.min(generation_per_hour_cap || 50, 200),
            total_pages: totalPages,
            status: 'planned',
            created_by: user?.email || 'admin',
            prompt_template_id: promptInputs.prompt_template_id,
            prompt_role: promptInputs.role,
            prompt_tone: promptInputs.tone,
            prompt_keywords: promptInputs.keywords,
            prompt_location: promptInputs.location,
            prompt_intent: promptInputs.intent,
            prompt_inputs: promptInputs,
        };

        let insertResult = await supabase
            .from('bulk_generation_jobs')
            .insert(insertPayload)
            .select()
            .single();

        if (insertResult.error && /prompt_/i.test(insertResult.error.message || '')) {
            const {
                prompt_template_id,
                prompt_role,
                prompt_tone,
                prompt_keywords,
                prompt_location,
                prompt_intent,
                prompt_inputs,
                ...legacyPayload
            } = insertPayload;

            insertResult = await supabase
                .from('bulk_generation_jobs')
                .insert(legacyPayload)
                .select()
                .single();
        }

        const { data, error } = insertResult;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Audit log (fire-and-forget)
        supabase.from('observability_logs').insert({
            level: 'INFO',
            message: `Bulk job created: "${name}" — ${totalPages} pages`,
            source: 'bulk_planner',
            metadata: { job_id: data.id, total_pages: totalPages, created_by: user?.email },
        }).then(() => {}).catch(() => {});

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
