import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { checkRedisStatus } from '../queue/redis.js';

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

    // 3. Redis Offline
    const redisStat = await checkRedisStatus();
    if (redisStat.redis_status === 'offline') {
        alerts.push({
            error_source: 'AlertEngine',
            error_message: 'Redis Memory Store is currently offline.'
        });
    }

    // 4. Worker Crash/Stale Heartbeats
    const { data: staleWorkers } = await supabase
        .from('worker_health')
        .select('worker_name, last_run, status')
        .or(`status.eq.error,last_run.lt.${new Date(Date.now() - 5 * 60000).toISOString()}`);

    if (staleWorkers && staleWorkers.length > 0) {
        const names = staleWorkers.map(w => w.worker_name).join(', ');
        alerts.push({
            error_source: 'AlertEngine',
            error_message: `Worker Crash/Stale Detected: ${names}`
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
