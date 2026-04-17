import { NextResponse } from 'next/server';
import '@/lib/tools/scoreLead';
import '@/lib/tools/routeLead';
import { executeTool } from '@/lib/tools/index';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import { handleEvent } from '@/lib/events/bus';
import { markCompleted, markFailed } from '@/lib/events/eventStore';

export const maxDuration = 300;

async function createJobRun(supabase, leadId) {
    try {
        const { data } = await supabase.from('job_runs').insert({
            job_class: 'ai-scorer',
            payload: { leadId },
            status: 'processing',
            started_at: new Date().toISOString(),
            worker_id: 'ai-scorer',
            completed_at: null,
            error: null
        }).select('id').single();

        return data?.id || null;
    } catch (e) {
        console.warn('[AI-Scorer] job_runs insert warning:', e.message);
        return null;
    }
}

async function finalizeJobRun(supabase, jobRunId, leadId, status, failureReason = null) {
    if (!jobRunId) return;

    try {
        const finishedAt = new Date().toISOString();
        await supabase.from('job_runs').update({
            status,
            failure_reason: failureReason,
            finished_at: finishedAt,
            completed_at: finishedAt,
            error: failureReason
        }).eq('id', jobRunId);

        if (status === 'failed') {
            await supabase.from('job_dead_letters').insert({
                job_run_id: jobRunId,
                job_class: 'ai-scorer',
                payload: { leadId },
                failure_reason: failureReason,
                error: failureReason,
                failed_at: finishedAt
            });
        }
    } catch (e) {
        console.warn('[AI-Scorer] job_runs finalize warning:', e.message);
    }
}

async function handler(request) {
    const config = await getSystemConfig();
    if (!config.ai_enabled) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'ai_enabled', route: '/api/jobs/ai-scorer' });
        return NextResponse.json({ success: true, message: 'AI scoring disabled via control config.' });
    }

    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const { leadId } = body;
    if (!leadId) {
        return NextResponse.json({ error: 'Missing leadId payload' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const jobRunId = await createJobRun(supabase, leadId);
    const eventStoreId = body._event_store_id || null;
    const executionContext = body._execution_context || {};
    const correlationId = executionContext.correlation_id || null;
    let successStatus = false;
    let errorMessage = null;
    let finalScore = null;
    let routingRes = null;

    try {
        const scoreResult = await executeTool('score_lead', { leadId }, executionContext);
        finalScore = scoreResult.success ? scoreResult.result : null;

        const routeResult = await executeTool('route_lead', { leadId }, executionContext);
        routingRes = routeResult.success ? routeResult.result : { reason: routeResult.error };

        // Dispatch followup via event bus (single path — Rule 3)
        try {
            const eventResult = await handleEvent('lead_hot', { leadId }, 'ai_scorer');
            if (!eventResult.success) {
                console.warn('[AI-Scorer] lead_hot event not dispatched:', eventResult.reason);
            }
        } catch (dispatchErr) {
            console.error('[AI-Scorer] lead_hot event bus failed:', dispatchErr.message);
        }

        successStatus = true;
    } catch (e) {
        errorMessage = e;
        console.error('[AI-Scorer Worker]', e);
    } finally {
        const executionTime = Date.now() - startTime;

        await finalizeJobRun(
            supabase,
            jobRunId,
            leadId,
            successStatus ? 'completed' : 'failed',
            !successStatus ? (errorMessage instanceof Error ? errorMessage.message : errorMessage) : null
        );

        // QStash-native: log to observability_logs instead of worker_health
        await supabase.from('observability_logs').insert({
            level: successStatus ? 'AI_SCORER_SUCCESS' : 'AI_SCORER_FAILURE',
            message: successStatus
                ? `Scored: ${finalScore || 'Skipped'}. Routed: ${routingRes?.agent_id || routingRes?.reason || 'None'}`
                : (errorMessage instanceof Error ? errorMessage.message : String(errorMessage)),
            source: 'ai-scorer',
            metadata: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                lead_id: leadId,
                correlation_id: correlationId,
                success: successStatus
            }
        }).catch((e) => console.warn('[AI-Scorer] observability log warning:', e.message));

        // COMPLETION ACK — mark event_store (Rule 2)
        if (successStatus) {
            await markCompleted(eventStoreId, {
                lead_id: leadId,
                score: finalScore,
                routing: routingRes,
                correlation_id: correlationId,
                execution_time_ms: executionTime,
            });
        } else {
            await markFailed(
                eventStoreId,
                errorMessage instanceof Error ? errorMessage.message : String(errorMessage),
                { lead_id: leadId, score: finalScore, routing: routingRes }
            );
        }
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage instanceof Error ? errorMessage.message : errorMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true, score: finalScore, routing: routingRes });
}

export const POST = verifySignatureAppRouter(handler);
