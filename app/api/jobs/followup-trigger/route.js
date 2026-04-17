import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getSystemConfig, logSystemAction } from '@/lib/systemConfig';
import { handleLeadHot } from '@/lib/executives/cso';
import { markCompleted, markFailed } from '@/lib/events/eventStore';

export const maxDuration = 300;

async function handler(request) {
    const config = await getSystemConfig();
    if (!config.followup_enabled) {
        await logSystemAction('GUARD_BLOCKED', { guard: 'followup_enabled', route: '/api/jobs/followup-trigger' });
        return NextResponse.json({ success: true, message: 'Follow-up disabled via control config.' });
    }

    const startTime = Date.now();
    const upstashMessageId = request.headers.get('upstash-message-id') || `manual-${Date.now()}`;
    
    let body = {};
    try { body = await request.json(); } catch { body = {}; }
    
    const { leadId } = body;
    if (!leadId) {
        return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const execCtx = body._execution_context || { event_id: upstashMessageId };
    const eventStoreId = body._event_store_id || null;
    const correlationId = execCtx.correlation_id || null;

    // CSO EXECUTIVE: Single authority for follow-up (Rule 3)
    try {
        const csoResult = await handleLeadHot(leadId, execCtx);
        const success = !csoResult.error;
        const executionTime = Date.now() - startTime;

        await supabase.from('observability_logs').insert({
            level: success ? 'FOLLOWUP_SUCCESS' : 'FOLLOWUP_FAILURE',
            message: `CSO executive: ${success ? 'completed' : csoResult.error || csoResult.skipped || 'failed'}`,
            source: 'followup-trigger',
            metadata: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                lead_id: leadId,
                correlation_id: correlationId,
                ...csoResult,
                event_id: execCtx.event_id,
            },
        }).catch(() => {});

        if (!success && csoResult.error) {
            // FAILURE ACK — mark event_store as failed (Rule 2)
            await markFailed(eventStoreId, csoResult.error, { lead_id: leadId, partial: csoResult });
            return NextResponse.json({ error: csoResult.error }, { status: 500 });
        }

        // COMPLETION ACK — mark event_store as completed (Rule 2)
        await markCompleted(eventStoreId, {
            lead_id: leadId,
            correlation_id: correlationId,
            execution_time_ms: executionTime,
            ...csoResult,
        });

        return NextResponse.json({ success: true, ...csoResult });
    } catch (csoErr) {
        const executionTime = Date.now() - startTime;
        console.error('[CSO Executive] Failed:', csoErr.message);

        await supabase.from('observability_logs').insert({
            level: 'FOLLOWUP_FAILURE',
            message: `CSO executive crashed: ${csoErr.message}`,
            source: 'followup-trigger',
            metadata: {
                job_id: upstashMessageId,
                execution_time_ms: executionTime,
                lead_id: leadId,
                correlation_id: correlationId,
                error: csoErr.message,
            },
        }).catch(() => {});

        // FAILURE ACK — mark event_store as failed on crash (Rule 2)
        await markFailed(eventStoreId, csoErr.message, { lead_id: leadId });

        return NextResponse.json({ error: csoErr.message }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
