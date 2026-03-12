import { NextResponse } from 'next/server';
import { getNetworkMetricsQueue } from '@/lib/queue/queues';
import { computeNetworkMetrics } from '@/lib/workers/networkMetricsWorker';
import { updateWorkerHealth } from '@/lib/monitoring/workerHealth';

export async function POST() {
    try {
        console.log('[DebugAPI] Starting worker verification...');

        // 1. Initial health ping
        await updateWorkerHealth('Node_BullMQ_Master', { status: 'starting' });
        console.log('[DebugAPI] Initial health ping sent.');

        // 2. Queue injection test
        const queue = getNetworkMetricsQueue();
        let job_id = null;
        if (queue) {
            const job = await queue.add('compute-network-metrics-test', { test: true }, {
                removeOnComplete: true,
                attempts: 1
            });
            job_id = job.id;
            console.log('[DebugAPI] Job added to queue:', job_id);
        } else {
            console.warn('[DebugAPI] Queue not found, skipping job injection.');
        }

        // 3. Native Logic Execution
        console.log('[DebugAPI] Beginning computeNetworkMetrics execution...');
        // We wrap this in a timeout or try/catch to ensure we get a response
        try {
            await computeNetworkMetrics();
            console.log('[DebugAPI] computeNetworkMetrics completed successfully.');
        } catch (computeError) {
            console.error('[DebugAPI] computeNetworkMetrics failed:', computeError.message);
            await updateWorkerHealth('Node_BullMQ_Master', { status: 'crashed', failures: 1 });
            return NextResponse.json({ error: computeError.message, stage: 'compute' }, { status: 500 });
        }

        // 4. Final health update
        await updateWorkerHealth('Node_BullMQ_Master', { jobsProcessed: 1, status: 'online' });
        console.log('[DebugAPI] Final health ping sent.');

        return NextResponse.json({
            success: true,
            job_id,
            message: 'NetworkMetrics verification lifecycle completed.'
        });
    } catch (err) {
        console.error('[DebugAPI] Global failure:', err);
        return NextResponse.json({ error: err.message, stage: 'global' }, { status: 500 });
    }
}
