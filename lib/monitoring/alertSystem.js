/**
 * UNIFIED ALERT SYSTEM — Production Ops Alerting
 * 
 * Consolidates all anomaly detection + external notification.
 * Replaces fragmented alertEngine.js + incidentDetector.js with a single,
 * production-grade alert pipeline.
 * 
 * Alert Flow:
 *   runAlertScan() → detect anomalies → deduplicate → persist → notify externally
 * 
 * Channels: Slack webhook, Email (via Resend/SMTP), WhatsApp (Twilio)
 * Configure via env vars: ALERT_SLACK_WEBHOOK, ALERT_EMAIL_TO, ALERT_WHATSAPP_TO
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getEventStoreStats, getStuckEvents } from '@/lib/events/eventStore';

// ─── ALERT THRESHOLDS ──────────────────────────────────────
const THRESHOLDS = {
    event_store_failed_critical: 5,      // >5 failed critical events → alert
    event_store_failed_total: 20,        // >20 total failed events → alert
    stuck_events: 1,                     // any stuck event → alert
    completion_rate_min: 95,             // <95% completion → alert
    qstash_failures_10m: 3,             // >3 QStash failures in 10 min → alert
    db_errors_1h: 20,                   // >20 DB errors in 1 hour → alert
    error_spike_10m: 30,               // >30 errors in 10 min → alert
    dedup_window_minutes: 60,           // suppress duplicate alerts for 60 min
};

// ─── ALERT DEFINITIONS ────────────────────────────────────
const ALERT_RULES = [
    {
        id: 'event_store_critical_failures',
        severity: 'critical',
        check: async (supabase) => {
            const stats = await getEventStoreStats();
            if (stats.critical_failed > THRESHOLDS.event_store_failed_critical) {
                return { triggered: true, message: `CRITICAL: ${stats.critical_failed} critical events failed in event_store`, data: stats };
            }
            return { triggered: false };
        },
    },
    {
        id: 'event_store_total_failures',
        severity: 'high',
        check: async (supabase) => {
            const stats = await getEventStoreStats();
            const failedCount = stats.by_status?.failed || 0;
            if (failedCount > THRESHOLDS.event_store_failed_total) {
                return { triggered: true, message: `HIGH: ${failedCount} total failed events in event_store`, data: { failedCount } };
            }
            return { triggered: false };
        },
    },
    {
        id: 'stuck_events',
        severity: 'critical',
        check: async () => {
            const stuck = await getStuckEvents(15, 10);
            if (stuck.length >= THRESHOLDS.stuck_events) {
                return {
                    triggered: true,
                    message: `CRITICAL: ${stuck.length} events stuck in dispatched state >15 min`,
                    data: { count: stuck.length, oldest: stuck[0]?.dispatched_at },
                };
            }
            return { triggered: false };
        },
    },
    {
        id: 'low_completion_rate',
        severity: 'high',
        check: async () => {
            const stats = await getEventStoreStats();
            if (stats.total > 10 && stats.completion_rate < THRESHOLDS.completion_rate_min) {
                return {
                    triggered: true,
                    message: `HIGH: Event completion rate at ${stats.completion_rate}% (threshold: ${THRESHOLDS.completion_rate_min}%)`,
                    data: { completion_rate: stats.completion_rate, total: stats.total },
                };
            }
            return { triggered: false };
        },
    },
    {
        id: 'qstash_failures',
        severity: 'critical',
        check: async (supabase) => {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('job_runs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'failed')
                .gte('started_at', tenMinsAgo);

            if (count > THRESHOLDS.qstash_failures_10m) {
                return { triggered: true, message: `CRITICAL: ${count} QStash job failures in last 10 minutes`, data: { count } };
            }
            return { triggered: false };
        },
    },
    {
        id: 'db_error_spike',
        severity: 'high',
        check: async (supabase) => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('system_runtime_errors')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', oneHourAgo);

            if (count > THRESHOLDS.db_errors_1h) {
                return { triggered: true, message: `HIGH: ${count} DB/system errors in last hour`, data: { count } };
            }
            return { triggered: false };
        },
    },
    {
        id: 'error_rate_spike',
        severity: 'high',
        check: async (supabase) => {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from('observability_logs')
                .select('*', { count: 'exact', head: true })
                .in('level', ['ERROR', 'CRITICAL', 'CONSISTENCY_VIOLATION', 'DB_CONTRACT_VIOLATION'])
                .gte('created_at', tenMinsAgo);

            if (count > THRESHOLDS.error_spike_10m) {
                return { triggered: true, message: `HIGH: ${count} error-level events in last 10 minutes`, data: { count } };
            }
            return { triggered: false };
        },
    },
];

// ─── MAIN SCAN FUNCTION ───────────────────────────────────
/**
 * Run all alert checks. Deduplicates, persists, and sends external notifications.
 * Called by the alert-scan cron job.
 */
export async function runAlertScan() {
    const supabase = getServiceSupabase();
    const results = [];

    for (const rule of ALERT_RULES) {
        try {
            const result = await rule.check(supabase);
            if (result.triggered) {
                // Deduplicate: check if same alert fired within dedup window
                const cutoff = new Date(Date.now() - THRESHOLDS.dedup_window_minutes * 60 * 1000).toISOString();
                const { data: existing } = await supabase
                    .from('system_alerts')
                    .select('id')
                    .eq('alert_type', rule.id)
                    .eq('resolved', false)
                    .gte('created_at', cutoff)
                    .limit(1);

                if (existing?.length) {
                    results.push({ rule: rule.id, status: 'deduplicated' });
                    continue;
                }

                // Persist alert
                await supabase.from('system_alerts').insert({
                    alert_type: rule.id,
                    severity: rule.severity,
                    message: result.message,
                    resolved: false,
                    metadata: result.data,
                });

                // Send external notifications
                await sendAlertNotifications(rule, result);

                results.push({ rule: rule.id, status: 'fired', severity: rule.severity, message: result.message });
            } else {
                results.push({ rule: rule.id, status: 'ok' });
            }
        } catch (err) {
            results.push({ rule: rule.id, status: 'error', error: err.message });
        }
    }

    // Log scan summary
    const fired = results.filter(r => r.status === 'fired');
    try { await supabase.from('observability_logs').insert({
        level: fired.length > 0 ? 'ALERT_SCAN_FIRED' : 'ALERT_SCAN_CLEAN',
        message: `Alert scan: ${fired.length} alerts fired, ${results.length} rules checked`,
        source: 'alert_system',
        metadata: { results },
    }); } catch (_) {}

    return { rules_checked: results.length, alerts_fired: fired.length, results };
}

// ─── EXTERNAL NOTIFICATION CHANNELS ──────────────────────
async function sendAlertNotifications(rule, result) {
    const promises = [];

    // Slack
    if (process.env.ALERT_SLACK_WEBHOOK) {
        promises.push(sendSlackAlert(rule, result).catch(e => console.error('[Alert] Slack failed:', e.message)));
    }

    // Email (via generic webhook / Resend / any SMTP-over-HTTP)
    if (process.env.ALERT_EMAIL_WEBHOOK && process.env.ALERT_EMAIL_TO) {
        promises.push(sendEmailAlert(rule, result).catch(e => console.error('[Alert] Email failed:', e.message)));
    }

    // WhatsApp (via Twilio or similar)
    if (process.env.ALERT_WHATSAPP_WEBHOOK && process.env.ALERT_WHATSAPP_TO) {
        promises.push(sendWhatsAppAlert(rule, result).catch(e => console.error('[Alert] WhatsApp failed:', e.message)));
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }
}

async function sendSlackAlert(rule, result) {
    const emoji = rule.severity === 'critical' ? '🚨' : '⚠️';
    const payload = {
        text: `${emoji} *BimaSakhi Alert — ${rule.severity.toUpperCase()}*\n${result.message}\n_Rule: ${rule.id}_`,
    };

    await fetch(process.env.ALERT_SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

async function sendEmailAlert(rule, result) {
    const payload = {
        to: process.env.ALERT_EMAIL_TO,
        subject: `[BimaSakhi ${rule.severity.toUpperCase()}] ${rule.id}`,
        body: `Alert: ${result.message}\n\nSeverity: ${rule.severity}\nRule: ${rule.id}\nData: ${JSON.stringify(result.data, null, 2)}`,
    };

    await fetch(process.env.ALERT_EMAIL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

async function sendWhatsAppAlert(rule, result) {
    const message = `🔔 BimaSakhi [${rule.severity.toUpperCase()}]\n${result.message}`;
    const payload = {
        to: process.env.ALERT_WHATSAPP_TO,
        message,
    };

    await fetch(process.env.ALERT_WHATSAPP_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// ─── EXPORTS ──────────────────────────────────────────────
export { THRESHOLDS, ALERT_RULES };
