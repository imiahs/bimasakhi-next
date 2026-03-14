import { NextResponse } from 'next/server';
import { updateWorkerHealth } from '@/lib/monitoring/workerHealth';
import { getBaseUrl } from '@/lib/queue/qstash';

export async function POST() {
    // Block debug routes in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    try {
        console.log('[DebugAPI] Starting Serverless Webhook verification...');

        // 1. Initial health ping
        await updateWorkerHealth('Node_Serverless_Edge', { status: 'starting' });

        // 2. Queue injection test via Local API path
        console.log('[DebugAPI] Binding integration test to isolated Next handler...');
        let job_id = `debug-manual-${Date.now()}`;
        const baseUrl = getBaseUrl();
        
        // 3. Native Logic Execution directly parsing the NetworkMetrics Webhook mapped to `route.js`
        const hookRes = await fetch(`${baseUrl}/api/jobs/metrics`, {
           method: 'POST',
           headers: { 'upstash-message-id': job_id } 
        });

        if (!hookRes.ok) {
            const errBody = await hookRes.text();
            console.error('[DebugAPI] Serverless API execution failed:', errBody);
            await updateWorkerHealth('Node_Serverless_Edge', { status: 'crashed', failures: 1 });
            return NextResponse.json({ error: errBody, stage: 'compute' }, { status: 500 });
        }

        // 4. Final health update
        await updateWorkerHealth('Node_Serverless_Edge', { jobsProcessed: 1, status: 'online' });
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
