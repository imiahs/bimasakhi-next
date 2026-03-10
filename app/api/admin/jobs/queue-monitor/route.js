import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const POST = withAdminAuth(async (request, user) => {
    if (process.env.SUPABASE_ENABLED !== 'true') {
        return NextResponse.json({ error: 'Database operations are disabled.' }, { status: 503 });
    }

    try {
        // Detect jobs stuck in "processing" for > 10 minutes
        const tenMinsAgo = new Date(Date.now() - 600000).toISOString();

        // Since we didn't add updated_at to generation_queue in schema securely, we logically 
        // fetch processing jobs and assume created_at/stuck interval. In production we'd enforce updated_at directly.
        const { data: stuckJobs } = await supabase
            .from('generation_queue')
            .select('*')
            .eq('status', 'processing')
            // Using created_at as an approximation for how long it's been alive safely
            .lt('created_at', tenMinsAgo);

        let recoveredCount = 0;
        let deadLetterCount = 0;

        if (stuckJobs && stuckJobs.length > 0) {
            for (const job of stuckJobs) {
                if (job.retry_count >= job.max_retries) {
                    // Send to Dead Letter Queue
                    await supabase.from('dead_letter_queue').insert({
                        job_type: job.task_type,
                        payload: job.payload,
                        failure_reason: 'Max retries exceeded due to persistent processing timeouts.'
                    });

                    await supabase.from('generation_queue').update({ status: 'failed' }).eq('id', job.id);
                    deadLetterCount++;
                } else {
                    // Recover back to Pending
                    await supabase.from('generation_queue').update({
                        status: 'pending',
                        retry_count: job.retry_count + 1
                    }).eq('id', job.id);

                    await supabase.from('generation_logs').insert({
                        queue_id: job.id,
                        event_type: 'job_recovered',
                        message: `Job recovered from stall. Retry attempt ${job.retry_count + 1} initiated.`
                    });

                    recoveredCount++;
                }
            }

            // Increment overall failed metric if necessary via system_metrics.
            if (deadLetterCount > 0) {
                const { data: metrics } = await supabase.from('system_metrics').select('id, jobs_failed').single();
                if (metrics) {
                    await supabase.from('system_metrics').update({ jobs_failed: metrics.jobs_failed + deadLetterCount }).eq('id', metrics.id);
                }
            }
        }

        return NextResponse.json({
            success: true,
            recovered_jobs: recoveredCount,
            dead_lettered_jobs: deadLetterCount
        });

    } catch (error) {
        console.error('Queue Monitor Engine Error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
});
