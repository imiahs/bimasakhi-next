import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
    if (process.env.SUPABASE_ENABLED !== 'true') {
        return NextResponse.json({ error: 'Database operations are disabled.' }, { status: 503 });
    }

    try {
        // Detect inactive workers (no heartbeat in 60+ seconds)
        const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();

        const { data: stuckWorkers, error: workerErr } = await supabase
            .from('worker_heartbeats')
            .select('id, worker_name')
            .eq('status', 'active')
            .lt('last_heartbeat', sixtySecondsAgo);

        if (workerErr) throw workerErr;

        let restartCount = 0;

        if (stuckWorkers && stuckWorkers.length > 0) {
            for (const worker of stuckWorkers) {
                // In a true environment, this might hit an orchestration API (e.g. Vercel webhook/PM2 trigger)
                // For serverless context, we just log a system error and reset its status mapping.

                await supabase.from('system_errors').insert({
                    error_type: 'Worker Timeout',
                    component: worker.worker_name,
                    message: `Worker failed to report heartbeat within 60s. Auto-restarting...`,
                    stack_trace: 'Recovery engine trigger',
                });

                // Update status forcing it to pick up fresh on its next Cron cycle logically.
                await supabase.from('worker_heartbeats').update({
                    status: 'restarted',
                    last_heartbeat: new Date().toISOString()
                }).eq('id', worker.id);

                restartCount++;
            }

            // Record telemetry
            const { data: metrics } = await supabase.from('system_metrics').select('id, worker_restarts').single();
            if (metrics) {
                await supabase.from('system_metrics').update({ worker_restarts: metrics.worker_restarts + restartCount }).eq('id', metrics.id);
            } else {
                await supabase.from('system_metrics').insert({ worker_restarts: restartCount });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Recovery engine ran. Restarts triggered: ${restartCount}`,
            restarts: restartCount
        });

    } catch (error) {
        console.error('Recovery Worker Engine Error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
