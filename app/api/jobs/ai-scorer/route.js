import { NextResponse } from 'next/server';
import { calculateLeadScore } from '@/lib/ai/leadScorer';
import { routeLeadToAgent } from '@/lib/ai/leadRouter';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

export const maxDuration = 300;

async function handler(request) {
    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    
    const { leadId } = body;
    if (!leadId) {
        return NextResponse.json({ error: 'Missing leadId payload' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let successStatus = false;
    let errorMessage = null;
    let finalScore = null;
    let routingRes = null;

    try {
        // 1. Calculate Score
        finalScore = await calculateLeadScore(leadId);

        // 2. Perform Routing Assignment
        routingRes = await routeLeadToAgent(leadId);

        // 3. Dispatch Follow-up Trigger (Asynchronous via QStash)
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
        if (!successStatus) {
            errorMessage = e;
            console.error('[AI-Scorer Worker]', e);
        }
    } finally {
        const executionTime = Date.now() - startTime;
        await supabase.from('worker_health').insert({
            worker_name: 'ai-scorer',
            status: successStatus ? 'healthy' : 'error',
            last_run: new Date().toISOString(),
            message: successStatus ? `Scored: ${finalScore || 'Skipped'}. Routed: ${routingRes?.agent_id || routingRes?.reason || 'None'}` : (errorMessage instanceof Error ? errorMessage.message : errorMessage),
            metrics: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                success: successStatus,
                lead_id: leadId,
                error_stack: !successStatus ? (errorMessage instanceof Error ? errorMessage.stack : errorMessage) : null
            }
        });
    }

    if (!successStatus) return NextResponse.json({ error: errorMessage instanceof Error ? errorMessage.message : errorMessage }, { status: 500 });
    return NextResponse.json({ success: true, score: finalScore, routing: routingRes });
}

export const POST = verifySignatureAppRouter(handler);
