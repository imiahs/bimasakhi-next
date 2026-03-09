import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';

let workerInstance = null;

export const startIndexWorker = () => {
    if (workerInstance) return workerInstance;

    const connection = getRedisConnection();
    if (!connection) {
        console.warn("Redis offline.");
        return null;
    }

    workerInstance = new Worker('IndexQueue', async job => {
        try {
            const limit = job.data?.batchSize || 200;
            const { data: pendingPages } = await supabase
                .from('page_index')
                .select('id')
                .eq('status', 'pending_index')
                .order('crawl_score', { ascending: false })
                .limit(limit);

            let promotedCount = 0;
            if (pendingPages?.length > 0) {
                const ids = pendingPages.map(p => p.id);
                const { error } = await supabase.from('page_index').update({ status: 'active' }).in('id', ids);
                if (!error) promotedCount = ids.length;
            }

            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
            const { data: weakPages } = await supabase.from('page_quality_scores').select('page_index_id').eq('traffic_score', 0).lte('last_computed_at', thirtyDaysAgo).limit(50);

            if (weakPages?.length > 0) {
                const weakIds = weakPages.map(p => p.page_index_id);
                await supabase.from('page_index').update({ status: 'noindex' }).in('id', weakIds);
            }

            systemLogger.logInfo('IndexWorker', `Promoted ${promotedCount} links natively`);
            metricsBatcher.recordJobProcessed();
            return { success: true, promoted: promotedCount };
        } catch (error) {
            systemLogger.logError('IndexWorker', `Fail logic: ${error.message}`);
            metricsBatcher.recordJobFailed();
            throw error;
        }
    }, { connection });

    return workerInstance;
};
