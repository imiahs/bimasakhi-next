import cron from 'node-cron';
import { getPageGeneratorQueue, getContentAuditQueue, getIndexQueue, getCacheQueue, getCrawlBudgetQueue, getNetworkMetricsQueue } from '../queue/queues.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';
import { acquireLock, releaseLock } from './schedulerLock.js';

console.log('[Scheduler] Initializing BullMQ Background Job Scheduler...');
systemLogger.logInfo('JobScheduler', 'Cron worker process initiated.');

// 1. Page Generator - Checks every 15 minutes for new chunks (Free Plan Optimized)
cron.schedule('*/15 * * * *', async () => {
    const lockKey = 'cron_lock:page_generator';
    if (!(await acquireLock(lockKey, 300))) return;
    try {
        const queue = getPageGeneratorQueue();
        if (queue) await queue.add('generate-batch', { limit: 50 }, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing page generation', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 2. Content Audit Engine - Checks duplicates every 1 hour (Free Plan Optimized)
cron.schedule('0 * * * *', async () => {
    const lockKey = 'cron_lock:content_audit';
    if (!(await acquireLock(lockKey, 600))) return;
    try {
        const queue = getContentAuditQueue();
        if (queue) await queue.add('audit-fingerprints', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing content audit', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 3. Index Drip Feed - Promotes 200 pages every 24 hours (Phase 25 Crawl Budget)
cron.schedule('0 2 * * *', async () => {
    const lockKey = 'cron_lock:index_drip_feed';
    if (!(await acquireLock(lockKey, 3600))) return;
    try {
        const queue = getIndexQueue();
        if (queue) await queue.add('promote-pages', { batchSize: 200 }, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing index promotion', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 4. Hot Page Cacher - Recomputes every 24 hours (Free Plan Optimized)
cron.schedule('0 0 * * *', async () => {
    const lockKey = 'cron_lock:hot_page_cacher';
    if (!(await acquireLock(lockKey, 3600))) return;
    try {
        const queue = getCacheQueue();
        if (queue) await queue.add('pre-render-cache', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing cache worker', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 4.5 Crawl Budget Optimizaton - Computes Scores & Priorities every 24 hours
cron.schedule('0 1 * * *', async () => {
    const lockKey = 'cron_lock:crawl_budget_opt';
    if (!(await acquireLock(lockKey, 3600))) return;
    try {
        const queue = getCrawlBudgetQueue();
        if (queue) await queue.add('compute-crawl-budget', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing crawl budget worker', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 4.6 Network Metrics OS - Computes Team Business & Dashboards every 6 hours
cron.schedule('0 */6 * * *', async () => {
    const lockKey = 'cron_lock:network_metrics_os';
    if (!(await acquireLock(lockKey, 3600))) return;
    try {
        const queue = getNetworkMetricsQueue();
        if (queue) await queue.add('compute-network-metrics', {}, { removeOnComplete: true });
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed queuing network metrics worker', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});

// 5. Metrics Telemetry Flush - Every 10 minutes (Phase 24 - Free Plan Safety)
cron.schedule('*/10 * * * *', async () => {
    const lockKey = 'cron_lock:metrics_flush';
    if (!(await acquireLock(lockKey, 120))) return;
    try {
        await metricsBatcher.flush();
    } catch (e) {
        systemLogger.logError('JobScheduler', 'Failed to flush metrics batcher', e.message);
    } finally {
        await releaseLock(lockKey);
    }
});
