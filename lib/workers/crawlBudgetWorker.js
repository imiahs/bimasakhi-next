import { Worker } from 'bullmq';
import { getRedisConnection } from '../queue/redis.js';
import { supabase } from '../supabase.js';
import { systemLogger } from '../logger/systemLogger.js';
import { metricsBatcher } from '../telemetry/metricsBatcher.js';

export const startCrawlBudgetWorker = () => {
    const conn = getRedisConnection();
    if (!conn) {
        systemLogger.logWarning('CrawlBudgetWorker', 'Redis not connected, skipping initialization.');
        return null;
    }

    const worker = new Worker('CrawlBudgetQueue', async (job) => {
        systemLogger.logInfo('CrawlBudgetWorker', `Starting crawl budget analysis job ${job.id}`);
        const startTime = Date.now();

        try {
            await processCrawlBudget();

            const duration = Date.now() - startTime;
            systemLogger.logInfo('CrawlBudgetWorker', `Job ${job.id} completed in ${duration}ms`);
            metricsBatcher.recordJobProcessed('crawlBudgetQueue', duration);

            return { success: true, processedAt: new Date().toISOString() };
        } catch (error) {
            systemLogger.logError('CrawlBudgetWorker', `Job ${job.id} failed: ${error.message}`, error.stack);
            metricsBatcher.recordJobFailed('crawlBudgetQueue');
            throw error;
        }
    }, { connection: conn, concurrency: 1 });

    worker.on('failed', (job, err) => {
        metricsBatcher.recordJobFailed('crawlBudgetQueue');
        systemLogger.logError('CrawlBudgetWorker', `Job ${job?.id} failed out-of-band: ${err.message}`);
    });

    console.log('[startWorkers] CrawlBudgetWorker initialized.');
    return worker;
};

async function processCrawlBudget() {
    // 1. Process Crawl Scores & Priority
    // Fetch joined data (score limit batches could be used if necessary, getting 500 at a time)
    const { data: scores, error: fetchError } = await supabase
        .from('page_quality_scores')
        .select(`
            page_index_id,
            traffic_score,
            conversion_score,
            engagement_score,
            seo_score,
            page_index ( id, status, path, created_at, internal_links_count )
        `);

    if (fetchError) throw fetchError;
    if (!scores || scores.length === 0) return;

    for (const row of scores) {
        const page = row.page_index;
        if (!page) continue;

        // Compute Weighted Crawl Score
        const crawlScore = Math.round(
            (row.traffic_score * 0.35) +
            (row.conversion_score * 0.30) +
            (row.engagement_score * 0.20) +
            (row.seo_score * 0.15)
        );

        // Compute Priority
        let priority = 'medium';
        if (crawlScore > 80) priority = 'high';
        else if (crawlScore < 40) priority = 'low';

        // Check Automated Noindex
        // traffic_score = 0 and engagement_score = 0 for 60 days
        let status = page.status;
        const pageAgeDays = (Date.now() - new Date(page.created_at).getTime()) / (1000 * 60 * 60 * 24);

        if (row.traffic_score === 0 && row.engagement_score === 0 && pageAgeDays > 60 && status === 'active') {
            status = 'noindex';
            systemLogger.logInfo('CrawlBudgetWorker', `Auto-noindexed dead page: ${page.path}`);
        }

        // Update page_index
        await supabase.from('page_index')
            .update({
                crawl_score: crawlScore,
                crawl_priority: priority,
                status: status
            })
            .eq('id', page.id);

        // Orphan Page Detection (Checking graph structure - loosely inferred via path / links)
        // A true leaf check: An orphan has no inbound links or isn't tied to the tree.
        // As a proxy based on user rule: Check if internal_links_count === 0 or path lacks hierarchy matching.
        // The rule says: pages must be linked to at least one parent node. 
        // We will query internal links if there's a link graph, or use internal_links_count.
        if (page.internal_links_count === 0 && status !== 'noindex') {
            // Further verify if standard locality path is not linked
            const pathParts = page.path.split('/').filter(Boolean);
            if (pathParts.length > 1) {
                // It's likely a locality or keyword page child. If internal_links = 0, it's orphan.
                const { data: existingRec } = await supabase
                    .from('seo_growth_recommendations')
                    .select('id')
                    .eq('page_index_id', page.id)
                    .eq('recommendation_type', 'ORPHAN_PAGE')
                    .single();

                if (!existingRec) {
                    await supabase.from('seo_growth_recommendations').insert({
                        page_index_id: page.id,
                        recommendation_type: 'ORPHAN_PAGE',
                        details: `Page ${page.path} has 0 internal links and is orphaned from the hierarchy graph.`
                    });
                }
            }
        }
    }
}
