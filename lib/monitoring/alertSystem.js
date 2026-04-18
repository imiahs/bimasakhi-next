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
 * Channels: Slack webhook, Email (via Resend/SMTP), WhatsApp (webhook), Telegram (Bot API)
 *
 * Stage 3 fix (C6): Added Telegram channel.
 * Configure via env vars:
 *   ALERT_SLACK_WEBHOOK      — Slack incoming webhook URL
 *   ALERT_EMAIL_WEBHOOK      — Email service POST endpoint
 *   ALERT_EMAIL_TO           — Recipient email address
 *   ALERT_WHATSAPP_WEBHOOK   — WhatsApp Business API webhook URL
 *   ALERT_WHATSAPP_TO        — WhatsApp recipient number (E.164 format, e.g. 919876543210)
 *   TELEGRAM_BOT_TOKEN       — Telegram Bot token (from BotFather)
 *   TELEGRAM_CHAT_ID         — CEO's Telegram chat ID (get via /api/admin/alert/test)
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
    const channelsAttempted = [];
    const channelsDelivered = [];

    // Determine severity mapping for alert_deliveries table
    const severityMap = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3', info: 'P3' };
    const severity = severityMap[rule.severity] || 'P2';

    // Slack
    if (process.env.ALERT_SLACK_WEBHOOK) {
        channelsAttempted.push('slack');
        try {
            await sendSlackAlert(rule, result);
            channelsDelivered.push('slack');
        } catch (e) {
            console.error('[Alert] Slack failed:', e.message);
        }
    }

    // Email
    if (process.env.ALERT_EMAIL_WEBHOOK && process.env.ALERT_EMAIL_TO) {
        channelsAttempted.push('email');
        try {
            await sendEmailAlert(rule, result);
            channelsDelivered.push('email');
        } catch (e) {
            console.error('[Alert] Email failed:', e.message);
        }
    }

    // WhatsApp
    if (process.env.ALERT_WHATSAPP_WEBHOOK && process.env.ALERT_WHATSAPP_TO) {
        channelsAttempted.push('whatsapp');
        try {
            await sendWhatsAppAlert(rule, result);
            channelsDelivered.push('whatsapp');
        } catch (e) {
            console.error('[Alert] WhatsApp failed:', e.message);
        }
    }

    // Telegram (Stage 3 fix — C6: primary CEO notification channel)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        channelsAttempted.push('telegram');
        try {
            await sendTelegramAlert(rule, result);
            channelsDelivered.push('telegram');
        } catch (e) {
            console.error('[Alert] Telegram failed:', e.message);
        }
    }

    // Persist delivery tracking to alert_deliveries table
    let deliveryStatus = 'failed';
    if (channelsDelivered.length === channelsAttempted.length && channelsDelivered.length > 0) {
        deliveryStatus = 'delivered';
    } else if (channelsDelivered.length > 0) {
        deliveryStatus = 'partial';
    } else if (channelsAttempted.length === 0) {
        deliveryStatus = 'pending'; // No channels configured
    }

    try {
        const supabase = getServiceSupabase();
        await supabase.from('alert_deliveries').insert({
            alert_type: rule.id,
            severity,
            message: result.message,
            context: result.data || {},
            channels_attempted: channelsAttempted,
            channels_delivered: channelsDelivered,
            delivery_status: deliveryStatus,
            next_escalation_at: severity === 'P0'
                ? new Date(Date.now() + 5 * 60 * 1000).toISOString()  // P0: escalate in 5 min
                : severity === 'P1'
                    ? new Date(Date.now() + 15 * 60 * 1000).toISOString()  // P1: escalate in 15 min
                    : null,
        });
    } catch {
        // Alert delivery tracking failure is non-fatal
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

// ─── TELEGRAM CHANNEL (Stage 3 fix — C6) ──────────────────
/**
 * Send alert to CEO via Telegram Bot API.
 * Setup: Create bot via @BotFather → get TELEGRAM_BOT_TOKEN.
 * Get chat ID: Start chat with bot → call /api/admin/alert/test?channel=telegram
 * Set env vars: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 */
async function sendTelegramAlert(rule, result) {
    const severityEmoji = { critical: '🚨', high: '⚠️', medium: '📋', low: 'ℹ️', info: 'ℹ️' };
    const emoji = severityEmoji[rule.severity] || '📢';

    const message = [
        `${emoji} *BimaSakhi System Alert*`,
        `*Severity:* ${rule.severity.toUpperCase()}`,
        `*Rule:* \`${rule.id}\``,
        `*Message:* ${result.message}`,
        `*Time:* ${new Date().toISOString()}`,
    ].join('\n');

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Telegram API error ${res.status}: ${body}`);
    }
}

// ─── EXPORTS ──────────────────────────────────────────────
export { THRESHOLDS, ALERT_RULES, sendTelegramAlert };
