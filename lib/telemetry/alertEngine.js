import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';

export const runAlertEngine = async (snapshotData) => {
    const alerts = [];

    // 1. Error Spike
    if (snapshotData.error_rate > 50) {
        alerts.push({
            error_source: 'AlertEngine',
            error_message: `High Error Rate Spike Detected: ${snapshotData.error_rate} errors in the last 10 minutes.`
        });
    }

    // 2. Queue Stuck
    if (snapshotData.queue_depth > 1000 && snapshotData.jobs_processed === 0) {
        alerts.push({
            error_source: 'AlertEngine',
            error_message: `Queue Stuck Anomaly: ${snapshotData.queue_depth} bounded jobs but 0 processed.`
        });
    }

    // 3. Failed jobs spike (replaces BullMQ worker_health check)
    const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
    const { data: recentFailures } = await supabase
        .from('job_runs')
        .select('worker_id, started_at')
        .eq('status', 'failed')
        .gte('started_at', tenMinsAgo);

    if (recentFailures && recentFailures.length > 0) {
        alerts.push({
            error_source: 'AlertEngine',
            error_message: `QStash Job Failures Detected: ${recentFailures.length} jobs failed in the last 10 minutes.`
        });
    }

    // Insert all alerts to system_errors
    for (const alert of alerts) {
        // Prevent duplicate spam within 1 hour
        const { data: existing } = await supabase
            .from('system_errors')
            .select('id')
            .eq('error_source', alert.error_source)
            .eq('error_message', alert.error_message)
            .gte('created_at', new Date(Date.now() - 3600000).toISOString())
            .limit(1);

        if (!existing || existing.length === 0) {
            systemLogger.logError(alert.error_source, alert.error_message, 'Anomaly detected by AlertEngine');
        }
    }
};
