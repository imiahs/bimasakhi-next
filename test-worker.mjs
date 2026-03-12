import { getNetworkMetricsQueue } from './lib/queue/queues.js';

async function triggerWorkerJob() {
    process.env.NODE_ENV = 'development';
    console.log("Triggering NetworkMetricsQueue job...");
    try {
        const queue = getNetworkMetricsQueue();
        if (!queue) {
            console.error("Queue not found. Check Redis connection.");
            return;
        }

        console.log("Adding job to NetworkMetricsQueue...");
        const job = await queue.add('compute-network-metrics', { test: true }, {
            removeOnComplete: true,
            attempts: 1
        });

        console.log(`Job added Successfully: ${job.id}`);

        console.log("Waiting 5 seconds for worker processing...");
        await new Promise(r => setTimeout(r, 5000));

        await queue.close();
        console.log("Queue closed. Verification complete.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to add job:", err);
        process.exit(1);
    }
}

triggerWorkerJob();
