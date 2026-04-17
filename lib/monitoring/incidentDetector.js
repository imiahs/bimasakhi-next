import { getServiceSupabase } from '@/utils/supabase';

/**
 * Sweeps observability schemas for statistical anomalies.
 * Designed to be run on a tight cron loop (e.g. every 15-30 minutes).
 */
export const runAnomalyScan = async () => {
    const supabase = getServiceSupabase();
    const alertsToFire = [];

    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const tenMinsAgo = new Date(now - 10 * 60 * 1000).toISOString();

    // 1. Detect Crash Cascades (Spikes in system_runtime_errors)
    const { count: recentErrors } = await supabase
        .from('system_runtime_errors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo);

    if (recentErrors > 50) {
        alertsToFire.push({
            alert_type: 'performance',
            severity: 'high',
            message: `CRITICAL SPIKE: ${recentErrors} system runtime errors detected in the last hour.`
        });
    }

    // 2. Detect Failed QStash Jobs (replaces BullMQ worker_health dead-worker check)
    const { data: failedJobs, count: failedCount } = await supabase
        .from('job_runs')
        .select('worker_id, started_at', { count: 'exact' })
        .eq('status', 'failed')
        .gte('started_at', tenMinsAgo);

    if (failedCount > 0) {
        alertsToFire.push({
            alert_type: 'worker',
            severity: 'high',
            message: `QSTASH JOB FAILURES: ${failedCount} QStash worker jobs failed in the last 10 minutes.`
        });
    }

    // 3. Detect Security / Credential Stuffing (Admin Audit Logs failed logins)
    // Looking for multiple 'login_failed' actions (if tracked) or unusual IP velocity.
    // For now, tracking brute force via 429 logic if we logged them, or simple volume:
    const { count: recentAdminActions } = await supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', tenMinsAgo);

    if (recentAdminActions > 1000) {
        alertsToFire.push({
            alert_type: 'security',
            severity: 'medium',
            message: `ABNORMALLY HIGH TRAFFIC: Over 1000 admin mutations logged in 10 minutes. Potential API abuse.`
        });
    }

    // Fire all generated alerts (deduplicating using raw SQL or checking existing)
    if (alertsToFire.length > 0) {
        // Simple dedup: check active alerts
        const { data: existingAlerts } = await supabase
            .from('system_alerts')
            .select('message')
            .eq('resolved', false);

        const existingMessages = new Set((existingAlerts || []).map(a => a.message));

        const newAlerts = alertsToFire.filter(a => !existingMessages.has(a.message));

        if (newAlerts.length > 0) {
            await supabase.from('system_alerts').insert(newAlerts);
        }
    }

    return { scanned: true, alertsFired: alertsToFire.length };
};
