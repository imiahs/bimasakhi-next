import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { runAlertEngine } from './alertEngine.js';

class MetricsBatcher {
    constructor() {
        this.resetState();
    }

    resetState() {
        this.metrics = {
            jobs_processed: 0,
            jobs_failed: 0,
            redis_latency_ms: 0,
            supabase_latency_ms: 0,
            queue_depth: 0,
            worker_uptime: process.uptime(),
            error_rate: 0
        };
        // Keeping track of count for averages
        this.redis_reports = 0;
        this.supabase_reports = 0;
    }

    recordJobProcessed() {
        this.metrics.jobs_processed++;
    }

    recordJobFailed() {
        this.metrics.jobs_failed++;
        this.metrics.error_rate++;
    }

    recordRedisLatency(ms) {
        this.metrics.redis_latency_ms += ms;
        this.redis_reports++;
    }

    recordSupabaseLatency(ms) {
        this.metrics.supabase_latency_ms += ms;
        this.supabase_reports++;
    }

    setQueueDepth(depth) {
        this.metrics.queue_depth = depth;
    }

    async flush() {
        try {
            // Calculate averages
            const avgRedis = this.redis_reports > 0 ? Math.round(this.metrics.redis_latency_ms / this.redis_reports) : 0;
            const avgSupabase = this.supabase_reports > 0 ? Math.round(this.metrics.supabase_latency_ms / this.supabase_reports) : 0;

            const snapshotData = {
                jobs_processed: this.metrics.jobs_processed,
                jobs_failed: this.metrics.jobs_failed,
                redis_latency_ms: avgRedis,
                supabase_latency_ms: avgSupabase,
                queue_depth: this.metrics.queue_depth,
                worker_uptime: Math.floor(process.uptime()),
                error_rate: this.metrics.error_rate,
                updated_at: new Date().toISOString()
            };

            // Upsert assuming single row with id = 1 for the snapshot
            const { error } = await supabase
                .from('system_metrics_snapshot')
                .upsert([
                    { id: 1, ...snapshotData }
                ], { onConflict: 'id' });

            if (error) {
                console.error('[MetricsBatcher] Failed to flush snapshot to DB', error);
                // We keep the state if failed to flush
                return false;
            }

            systemLogger.logInfo('MetricsBatcher', 'Flushed metrics snapshot to DB');

            // Run Alert Engine heuristics
            await runAlertEngine(snapshotData);

            // Reset only after successful flush
            this.resetState();
            return true;
        } catch (e) {
            console.error('[MetricsBatcher] Exception during flush', e);
            return false;
        }
    }
}

export const metricsBatcher = new MetricsBatcher();
