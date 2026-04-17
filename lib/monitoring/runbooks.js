/**
 * RUNBOOK ENGINE — Automated Incident Response
 * 
 * Defines IF-THEN rules for common production incidents.
 * Each runbook has:
 *   - detect(): check if the condition is active
 *   - action(): execute the automated response
 *   - description: human-readable explanation
 * 
 * Runbooks can be triggered automatically by the alert scan
 * or manually by admin via /api/admin/actions POST action=run_runbook
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemMode, setSystemMode } from '@/lib/system/systemModes';
import { getEventStoreStats, getStuckEvents } from '@/lib/events/eventStore';

// ─── RUNBOOK DEFINITIONS ──────────────────────────────────
const RUNBOOKS = {
    qstash_down: {
        id: 'qstash_down',
        description: 'QStash appears down — switch to DEGRADED mode, pause non-critical dispatch',
        severity: 'critical',
        detect: async (supabase) => {
            // QStash down = recent publishes all failed, or 0 completions in last 15 min
            // while events were dispatched
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

            const [{ count: dispatched }, { count: completed }] = await Promise.all([
                supabase.from('event_store').select('*', { count: 'exact', head: true })
                    .eq('status', 'dispatched').gte('dispatched_at', fifteenMinsAgo),
                supabase.from('event_store').select('*', { count: 'exact', head: true })
                    .eq('status', 'completed').gte('completed_at', fifteenMinsAgo),
            ]);

            // If we dispatched >5 events but 0 completed → QStash likely down
            return dispatched > 5 && completed === 0;
        },
        action: async (supabase) => {
            const currentMode = await getSystemMode();
            if (currentMode === 'emergency') return { action: 'none', reason: 'already in emergency mode' };

            const result = await setSystemMode('degraded');
            await supabase.from('observability_logs').insert({
                level: 'RUNBOOK_EXECUTED',
                message: 'Runbook qstash_down: switched to DEGRADED mode',
                source: 'runbook_engine',
                metadata: { runbook: 'qstash_down', previous_mode: currentMode, new_mode: 'degraded' },
            });

            return { action: 'mode_switch', from: currentMode, to: 'degraded', success: result.success };
        },
    },

    db_slow: {
        id: 'db_slow',
        description: 'Database errors spiking — switch to EMERGENCY mode (DB-only, no dispatch)',
        severity: 'critical',
        detect: async (supabase) => {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('system_runtime_errors')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', tenMinsAgo);

            return count > 30; // >30 DB errors in 10 min = DB is struggling
        },
        action: async (supabase) => {
            const currentMode = await getSystemMode();
            if (currentMode === 'emergency') return { action: 'none', reason: 'already in emergency mode' };

            const result = await setSystemMode('emergency');
            await supabase.from('observability_logs').insert({
                level: 'RUNBOOK_EXECUTED',
                message: 'Runbook db_slow: switched to EMERGENCY mode',
                source: 'runbook_engine',
                metadata: { runbook: 'db_slow', previous_mode: currentMode, new_mode: 'emergency' },
            });

            return { action: 'mode_switch', from: currentMode, to: 'emergency', success: result.success };
        },
    },

    failure_spike: {
        id: 'failure_spike',
        description: 'Failure rate spiking — pause non-critical flows (AI, followup, pagegen)',
        severity: 'high',
        detect: async (supabase) => {
            const stats = await getEventStoreStats();
            // If >20% of recent events are failing and we have a meaningful sample
            if (stats.total > 20) {
                const failRate = ((stats.by_status?.failed || 0) / stats.total) * 100;
                return failRate > 20;
            }
            return false;
        },
        action: async (supabase) => {
            // Disable non-critical flags
            const { error } = await supabase
                .from('system_control_config')
                .update({
                    ai_enabled: false,
                    followup_enabled: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('singleton_key', true);

            await supabase.from('observability_logs').insert({
                level: 'RUNBOOK_EXECUTED',
                message: 'Runbook failure_spike: disabled AI + followup flows',
                source: 'runbook_engine',
                metadata: { runbook: 'failure_spike', disabled: ['ai_enabled', 'followup_enabled'] },
            });

            return { action: 'disable_non_critical', disabled: ['ai_enabled', 'followup_enabled'], success: !error };
        },
    },

    stuck_event_recovery: {
        id: 'stuck_event_recovery',
        description: 'Stuck events detected — mark as failed for retry daemon to pick up',
        severity: 'high',
        detect: async () => {
            const stuck = await getStuckEvents(20, 5);
            return stuck.length > 0;
        },
        action: async (supabase) => {
            // This is already handled by event-retry daemon's markStuckAsFailed()
            // But if retry daemon itself is stuck, we force it here
            const { markStuckAsFailed } = await import('@/lib/events/eventStore');
            const result = await markStuckAsFailed();
            await supabase.from('observability_logs').insert({
                level: 'RUNBOOK_EXECUTED',
                message: `Runbook stuck_event_recovery: forced stuck sweep`,
                source: 'runbook_engine',
                metadata: { runbook: 'stuck_event_recovery', result },
            });

            return { action: 'force_stuck_sweep', ...result };
        },
    },
};

// ─── EXECUTION ENGINE ─────────────────────────────────────

/**
 * Run all runbook detections and execute triggered ones.
 * Called by the alert-scan job after alert checks complete.
 */
export async function evaluateRunbooks() {
    const supabase = getServiceSupabase();
    const results = [];

    for (const [id, runbook] of Object.entries(RUNBOOKS)) {
        try {
            const triggered = await runbook.detect(supabase);
            if (triggered) {
                // Check if this runbook ran recently (prevent rapid re-execution)
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                const { data: recent } = await supabase
                    .from('observability_logs')
                    .select('id')
                    .eq('level', 'RUNBOOK_EXECUTED')
                    .ilike('message', `%${id}%`)
                    .gte('created_at', thirtyMinsAgo)
                    .limit(1);

                if (recent?.length) {
                    results.push({ runbook: id, status: 'cooldown', reason: 'ran within last 30 min' });
                    continue;
                }

                const actionResult = await runbook.action(supabase);
                results.push({ runbook: id, status: 'executed', severity: runbook.severity, result: actionResult });
            } else {
                results.push({ runbook: id, status: 'not_triggered' });
            }
        } catch (err) {
            results.push({ runbook: id, status: 'error', error: err.message });
        }
    }

    return results;
}

/**
 * Execute a specific runbook by ID (admin manual trigger).
 */
export async function executeRunbook(runbookId) {
    const runbook = RUNBOOKS[runbookId];
    if (!runbook) {
        return { success: false, error: `Unknown runbook: ${runbookId}. Available: ${Object.keys(RUNBOOKS).join(', ')}` };
    }

    const supabase = getServiceSupabase();
    try {
        const result = await runbook.action(supabase);
        return { success: true, runbook: runbookId, result };
    } catch (err) {
        return { success: false, runbook: runbookId, error: err.message };
    }
}

export { RUNBOOKS };
