import cron from 'node-cron';
import { getPageGeneratorQueue, getContentAuditQueue, getIndexQueue, getCacheQueue } from '../queue/queues.js';
import { systemLogger } from '../logger/systemLogger.js';

// Explicitly invoke wrapped isolated routines instead of importing native file loops
import { startPageGeneratorWorker } from '../workers/pageGeneratorWorker.js';
import { startContentAuditWorker } from '../workers/contentAuditWorker.js';
import { startIndexWorker } from '../workers/indexWorker.js';
import { startCacheWorker } from '../workers/cacheWorker.js';

console.log('[Scheduler] Initializing BullMQ Background Job Scheduler...');
systemLogger.logInfo('JobScheduler', 'Cron worker process initiated.');

// Spin up background Nodes independently securely mapping generic connections.
startPageGeneratorWorker();
startContentAuditWorker();
startIndexWorker();
startCacheWorker();

// 1. Page Generator - Checks every 5 minutes for new chunks
cron.schedule('*/5 * * * *', async () => {
    try {
        const queue = getPageGeneratorQueue();
        if (queue) await queue.add('generate-batch', { limit: 100 }, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing page generation', e.message);
    }
});

// 2. Content Audit Engine - Checks duplicates every 15 minutes 
cron.schedule('*/15 * * * *', async () => {
    try {
        const queue = getContentAuditQueue();
        if (queue) await queue.add('audit-fingerprints', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing content audit', e.message);
    }
});

// 3. Index Drip Feed - Promotes pages every 1 hour
cron.schedule('0 * * * *', async () => {
    try {
        const queue = getIndexQueue();
        if (queue) await queue.add('promote-pages', { batchSize: 20 }, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing index promotion', e.message);
    }
});

// 4. Hot Page Cacher - Recomputes every 6 hours
cron.schedule('0 */6 * * *', async () => {
    try {
        const queue = getCacheQueue();
        if (queue) await queue.add('pre-render-cache', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing cache worker', e.message);
    }
});
