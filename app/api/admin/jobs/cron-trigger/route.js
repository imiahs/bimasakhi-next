import { NextResponse } from 'next/server';
import { getPageGeneratorQueue, getContentAuditQueue, getIndexQueue, getCacheQueue, getCrawlBudgetQueue, getNetworkMetricsQueue } from '@/lib/queue/queues';
import { logError } from '@/lib/monitoring/logError';
import { runAnomalyScan } from '@/lib/monitoring/incidentDetector';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for cron jobs

/**
 * Vercel Cron Trigger — replaces node-cron scheduler.
 * Each Vercel Cron job hits this route with ?job=<name>.
 * Auth via CRON_SECRET bearer token (Vercel injects this automatically).
 */
export async function GET(request) {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const job = searchParams.get('job');

    if (!job) {
        return NextResponse.json({ error: 'Missing job parameter' }, { status: 400 });
    }

    try {
        let result = null;

        switch (job) {
            case 'page-generator': {
                const queue = getPageGeneratorQueue();
                if (queue) {
                    const added = await queue.add('generate-batch', { limit: 50 }, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'PageGeneratorQueue' };
                }
                break;
            }
            case 'content-audit': {
                const queue = getContentAuditQueue();
                if (queue) {
                    const added = await queue.add('audit-fingerprints', {}, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'ContentAuditQueue' };
                }
                break;
            }
            case 'index-drip-feed': {
                const queue = getIndexQueue();
                if (queue) {
                    const added = await queue.add('promote-pages', { batchSize: 200 }, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'IndexQueue' };
                }
                break;
            }
            case 'crawl-budget': {
                const queue = getCrawlBudgetQueue();
                if (queue) {
                    const added = await queue.add('compute-crawl-budget', {}, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'CrawlBudgetQueue' };
                }
                break;
            }
            case 'cache-worker': {
                const queue = getCacheQueue();
                if (queue) {
                    const added = await queue.add('pre-render-cache', {}, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'CacheQueue' };
                }
                break;
            }
            case 'network-metrics': {
                const queue = getNetworkMetricsQueue();
                if (queue) {
                    const added = await queue.add('compute-network-metrics', {}, { removeOnComplete: true });
                    result = { jobId: added.id, queue: 'NetworkMetricsQueue' };
                }
                break;
            }
            case 'metrics-flush': {
                // Import dynamically to keep cold start lean
                const { metricsBatcher } = await import('@/lib/telemetry/metricsBatcher');
                const flushed = await metricsBatcher.flush();
                result = { flushed };
                break;
            }
            case 'incident-scan': {
                const scanResult = await runAnomalyScan();
                result = scanResult;
                break;
            }
            default:
                return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            job,
            result: result || { message: 'Queue unavailable — job skipped' },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`[CronTrigger] Job "${job}" failed:`, error);
        await logError('CronTrigger', `Cron job "${job}" failed`, error);
        return NextResponse.json({ error: 'Job execution failed', details: error.message }, { status: 500 });
    }
}
