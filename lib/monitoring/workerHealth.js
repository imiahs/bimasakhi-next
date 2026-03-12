import { getServiceSupabase } from '../../utils/supabaseClientSingleton.js';

/**
 * Pings the distributed worker_health Supabase table to track job metrics and memory crashes.
 * Works seamlessly across Edge API Workers and Node BullMQ Daemons.
 */
export const updateWorkerHealth = async (workerName, metrics = {}) => {
    try {
        const supabase = getServiceSupabase();

        // Dynamically measure V8 heap stats if running in standard Node.js
        const memoryPayload = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null;

        // Fetch existing stats to cleanly increment
        const { data: existing } = await supabase
            .from('worker_health')
            .select('jobs_processed, failures')
            .eq('worker_name', workerName)
            .single();

        const newJobs = (existing?.jobs_processed || 0) + (metrics.jobsProcessed || 0);
        const newFails = (existing?.failures || 0) + (metrics.failures || 0);

        await supabase.from('worker_health').upsert({
            worker_name: workerName,
            last_heartbeat: new Date().toISOString(),
            jobs_processed: newJobs,
            failures: newFails,
            memory_usage: memoryPayload,
            status: metrics.status || 'online'
        }, { onConflict: 'worker_name' });

    } catch (e) {
        console.error(`[HealthMonitor] Failed to sync heartbeat for ${workerName}:`, e.message);
    }
};
