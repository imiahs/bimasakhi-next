import { NextResponse } from 'next/server';
import { calculateLeadScore } from '@/lib/ai/leadScorer';
import { routeLeadToAgent } from '@/lib/ai/leadRouter';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';

export const maxDuration = 300;

async function createJobRun(supabase, leadId) {
    try {
        const { data } = await supabase.from('job_runs').insert({
            job_class: 'ai-scorer',
            payload: { leadId },
            status: 'processing',
            started_at: new Date().toISOString(),
            worker_id: 'ai-scorer'
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
        await supabase.from('job_runs').update({
            status,
            failure_reason: failureReason,
            finished_at: new Date().toISOString()
        }).eq('id', jobRunId);

        if (status === 'failed') {
            await supabase.from('job_dead_letters').insert({
                job_run_id: jobRunId,
                job_class: 'ai-scorer',
                payload: { leadId },
                failure_reason: failureReason
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
    let successStatus = false;
    let errorMessage = null;
    let finalScore = null;
    let routingRes = null;

    try {
        finalScore = await calculateLeadScore(leadId);
        routingRes = await routeLeadToAgent(leadId);

        try {
            const { getQStashClient, getBaseUrl } = await import('@/lib/queue/qstash.js');
            const qstash = getQStashClient();
            const baseUrl = getBaseUrl();

            if (qstash) {
                await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/followup-trigger`,
                    body: { leadId }
                });
            }
        } catch (dispatchErr) {
            console.error('[AI-Scorer] Follow-up dispatch failed:', dispatchErr);
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

        await supabase.from('worker_health').insert({
            worker_name: 'ai-scorer',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus
                ? `Scored: ${finalScore || 'Skipped'}. Routed: ${routingRes?.agent_id || routingRes?.reason || 'None'}`
                : (errorMessage instanceof Error ? errorMessage.message : errorMessage),
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                success: successStatus,
                lead_id: leadId,
                error_stack: !successStatus ? (errorMessage instanceof Error ? errorMessage.stack : errorMessage) : null
            }
        }).catch((e) => console.warn('[AI-Scorer] worker_health warning:', e.message));
    }

    if (!successStatus) {
        return NextResponse.json({ error: errorMessage instanceof Error ? errorMessage.message : errorMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true, score: finalScore, routing: routingRes });
}

export const POST = verifySignatureAppRouter(handler);
