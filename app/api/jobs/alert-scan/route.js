import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { runAlertScan } from '@/lib/monitoring/alertSystem';
import { evaluateRunbooks } from '@/lib/monitoring/runbooks';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { sendTelegramAlert } from '@/lib/monitoring/alertSystem';

export const maxDuration = 30;

/**
 * ALERT SCAN JOB — Scheduled via QStash cron (every 5 minutes).
 * 
 * 1. Runs all alert rules (detect, dedup, persist, notify)
 * 2. Evaluates runbooks (auto-remediation for known incidents)
 * 3. Checks for unacknowledged alerts past escalation deadline (21f)
 * 
 * QStash Schedule:
 *   URL: https://bimasakhi.com/api/jobs/alert-scan
 *   Cron: every 5 minutes
 */
async function handler() {
    try {
        const [alertResult, runbookResult, escalationResult] = await Promise.all([
            runAlertScan(),
            evaluateRunbooks(),
            runEscalationCheck(),
        ]);

        return NextResponse.json({
            success: true,
            alerts: alertResult,
            runbooks: runbookResult,
            escalations: escalationResult,
        });
    } catch (err) {
        console.error('[AlertScan] Fatal error:', err.message);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

/**
 * Phase 21f — Escalation Check
 * Re-fires unacknowledged P0/P1 alerts past their next_escalation_at deadline.
 * P0: re-fires every 5 min. P1: every 15 min.
 */
async function runEscalationCheck() {
    try {
        const supabase = getServiceSupabase();
        const now = new Date().toISOString();

        // Find unacknowledged alerts past escalation deadline
        const { data: overdue, error } = await supabase
            .from('alert_deliveries')
            .select('*')
            .eq('acknowledged', false)
            .in('severity', ['P0', 'P1'])
            .not('next_escalation_at', 'is', null)
            .lte('next_escalation_at', now)
            .order('created_at', { ascending: true })
            .limit(10);

        if (error || !overdue?.length) {
            return { escalated: 0 };
        }

        let escalated = 0;
        for (const alert of overdue) {
            // Re-send via Telegram
            if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
                try {
                    const retryCount = (alert.retry_count || 0) + 1;
                    await sendTelegramAlert(
                        { id: alert.alert_type, severity: alert.severity === 'P0' ? 'critical' : 'high' },
                        { triggered: true, message: `🔁 ESCALATION (attempt ${retryCount}): ${alert.message}`, data: alert.context }
                    );
                    escalated++;
                } catch { /* non-fatal */ }
            }

            // Update next escalation time and retry count
            const nextDelay = alert.severity === 'P0' ? 5 * 60 * 1000 : 15 * 60 * 1000;
            const maxRetries = alert.severity === 'P0' ? 12 : 4; // P0: 1 hour, P1: 1 hour
            const retryCount = (alert.retry_count || 0) + 1;

            await supabase.from('alert_deliveries')
                .update({
                    retry_count: retryCount,
                    next_escalation_at: retryCount >= maxRetries
                        ? null  // Stop escalating after max retries
                        : new Date(Date.now() + nextDelay).toISOString(),
                })
                .eq('id', alert.id);
        }

        if (escalated > 0) {
            await supabase.from('observability_logs').insert({
                level: 'ESCALATION',
                message: `Escalated ${escalated} unacknowledged alerts`,
                source: 'alert_escalation',
                metadata: { escalated, overdue_count: overdue.length },
            }).then(() => {}).catch(() => {});
        }

        return { escalated };
    } catch (err) {
        console.error('[Escalation] Error:', err.message);
        return { escalated: 0, error: err.message };
    }
}

export const POST = verifySignatureAppRouter(handler);
