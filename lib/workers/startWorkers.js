import { systemLogger } from '../logger/systemLogger.js';
import { updateWorkerHealth } from '../monitoring/workerHealth.js';
import { startPageGeneratorWorker } from './pageGeneratorWorker.js';
import { startContentAuditWorker } from './contentAuditWorker.js';
import { startIndexWorker } from './indexWorker.js';
import { startCacheWorker } from './cacheWorker.js';
import { startCrawlBudgetWorker } from './crawlBudgetWorker.js';
import { startNetworkMetricsWorker } from './networkMetricsWorker.js';

console.log('[startWorkers] Initializing isolated BullMQ background workers...');
systemLogger.logInfo('StartWorkers', 'Worker execution process initiated.');

// Ping health status every 30 seconds for verification (PROD: 5 minutes)
setInterval(() => {
    updateWorkerHealth('Node_BullMQ_Master', { status: 'online' });
}, 30 * 1000);

try {
    startPageGeneratorWorker();
    startContentAuditWorker();
    startIndexWorker();
    startCacheWorker();
    startCrawlBudgetWorker();
    startNetworkMetricsWorker();
    console.log('[startWorkers] All isolated workers successfully started.');
} catch (e) {
    systemLogger.logError('StartWorkers', 'Failed to start workers', e.message);
    process.exit(1);
}
