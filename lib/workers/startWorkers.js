import { systemLogger } from '../logger/systemLogger.js';
import { startPageGeneratorWorker } from './pageGeneratorWorker.js';
import { startContentAuditWorker } from './contentAuditWorker.js';
import { startIndexWorker } from './indexWorker.js';
import { startCacheWorker } from './cacheWorker.js';

console.log('[startWorkers] Initializing isolated BullMQ background workers...');
systemLogger.logInfo('StartWorkers', 'Worker execution process initiated.');

try {
    startPageGeneratorWorker();
    startContentAuditWorker();
    startIndexWorker();
    startCacheWorker();
    console.log('[startWorkers] All isolated workers successfully started.');
} catch (e) {
    systemLogger.logError('StartWorkers', 'Failed to start workers', e.message);
    process.exit(1);
}
