/**
 * CMO EXECUTIVE — Handles lead acquisition pipeline.
 * 
 * Events: lead_created, lead_scored
 * Flow: score → route → emit lead_hot (if score >= 80)
 * 
 * TRANSACTION SAFETY:
 * - Uses saga pattern: if route fails after score succeeds, score is compensated
 * - Post-execution consistency check verifies DB state
 * - Partial failures are surfaced, never hidden
 */
import '@/lib/tools/scoreLead';
import '@/lib/tools/routeLead';
import { executeTool } from '@/lib/tools/index';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { executeSaga, verifyConsistency } from '@/lib/system/transaction';

export async function handleLeadCreated(leadId, executionContext = {}) {
    const startTime = Date.now();
    const supabase = getServiceSupabase();

    // Define saga steps with compensation
    const saga = await executeSaga('cmo_lead_scoring', [
        {
            name: 'score_lead',
            execute: async () => {
                const result = await executeTool('score_lead', { leadId }, executionContext);
                if (!result.success) throw new Error(result.error || 'score_lead failed');
                return result;
            },
            compensate: async () => {
                // Rollback: clear the score that was written
                await supabase.from('leads').update({ lead_score: null }).eq('id', leadId);
            },
        },
        {
            name: 'route_lead',
            execute: async () => {
                const result = await executeTool('route_lead', { leadId }, executionContext);
                if (!result.success) throw new Error(result.error || 'route_lead failed');
                return result;
            },
            compensate: async () => {
                // Rollback: clear the agent assignment
                await supabase.from('leads').update({ agent_id: null }).eq('id', leadId);
            },
        },
    ], { leadId, correlation_id: executionContext.correlation_id });

    // Build results in the legacy format for backward compatibility
    const scoreResult = saga.results.score_lead || { success: false };
    const routeResult = saga.results.route_lead || { success: false };

    const results = {
        executive: 'cmo',
        event: 'lead_created',
        leadId,
        steps: [
            { tool: 'score_lead', success: scoreResult.success, score: scoreResult.result?.result, duration_ms: scoreResult.result?.duration_ms },
            { tool: 'route_lead', success: routeResult.success, result: routeResult.result?.result, duration_ms: routeResult.result?.duration_ms },
        ],
        saga_compensated: saga.compensated,
        hot_lead: false,
        duration_ms: Date.now() - startTime,
    };

    // Determine hot lead status
    if (scoreResult.success && typeof scoreResult.result?.result === 'number') {
        results.hot_lead = scoreResult.result.result >= 80;
    }

    // POST-EXECUTION CONSISTENCY CHECK (Rule 4)
    if (saga.success) {
        const consistency = await verifyConsistency([
            {
                name: 'lead_score_set',
                check: async () => {
                    const { data } = await supabase.from('leads').select('lead_score').eq('id', leadId).single();
                    return { valid: data?.lead_score !== null && data?.lead_score !== undefined, actual: data?.lead_score, expected: 'non-null score' };
                },
            },
            {
                name: 'agent_assigned',
                check: async () => {
                    const { data } = await supabase.from('leads').select('agent_id').eq('id', leadId).single();
                    // agent_id can be null if routing decided to skip (manual_override, etc.)
                    // So we check if routing returned success — if yes, agent_id must be set
                    if (routeResult.result?.result?.success === false) {
                        return { valid: true, actual: data?.agent_id, expected: 'null (routing skipped)' };
                    }
                    return { valid: data?.agent_id !== null, actual: data?.agent_id, expected: 'assigned agent_id' };
                },
            },
        ]);
        results.consistency = consistency;
    }

    // Log executive action
    const logLevel = saga.compensated ? 'EXECUTIVE_COMPENSATED' : 'EXECUTIVE_COMPLETE';
    try { await supabase.from('observability_logs').insert({
        level: logLevel,
        message: `CMO: lead ${leadId} — score=${scoreResult.result?.result || 'n/a'}, routed=${routeResult.success}, hot=${results.hot_lead}${saga.compensated ? ' [COMPENSATED]' : ''}`,
        source: 'executive_cmo',
        metadata: {
            ...results,
            event_id: executionContext.event_id,
            correlation_id: executionContext.correlation_id,
        },
    }); } catch (_) {}

    return results;
}
