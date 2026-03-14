import { NextResponse } from 'next/server';
import { getQStashClient, getBaseUrl } from '@/lib/queue/qstash';
import { logError } from '@/lib/monitoring/logError';
import { runAnomalyScan } from '@/lib/monitoring/incidentDetector';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for cron jobs

/**
 * Vercel Cron Trigger — Replaces node-cron scheduler.
 * Each Vercel Cron job hits this route with ?job=<name>.
 * Auth via CRON_SECRET bearer token (Vercel injects this automatically).
 * Uses Upstash QStash to queue Serverless worker jobs idempotently.
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
        const qstash = getQStashClient();
        const baseUrl = getBaseUrl();

        if (!qstash && job !== 'incident-scan' && job !== 'metrics-flush') {
            return NextResponse.json({ error: 'QStash client missing or queues disabled.' }, { status: 500 });
        }

        switch (job) {
            case 'page-generator': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/pagegen`,
                    body: { limit: 50 },
                    retries: 3
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
                break;
            }
            case 'content-audit': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/audit`,
                    body: {},
                    retries: 1
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
                break;
            }
            case 'index-drip-feed': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/index`,
                    body: { batchSize: 200 },
                    retries: 3
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
                break;
            }
            case 'crawl-budget': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/crawl`,
                    body: {},
                    retries: 2
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
                break;
            }
            case 'cache-worker': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/cache`,
                    body: {},
                    retries: 3
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
                break;
            }
            case 'network-metrics': {
                const added = await qstash.publishJSON({
                    url: `${baseUrl}/api/jobs/metrics`,
                    body: {},
                    retries: 1
                });
                result = { messageId: added.messageId, queue: 'QStash Node' };
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
