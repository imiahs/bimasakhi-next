import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { processJob } from '@/lib/workers/worker';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const trimEnv = (value = '') => value.replace(/^"(.*)"$/, '$1').trim();

const isAuthorizedFailureTest = (request) => {
    const mode = request.headers.get('x-worker-test-mode');
    const key = request.headers.get('x-worker-test-key');
    const adminPassword = trimEnv(process.env.ADMIN_PASSWORD || '');

    return Boolean(
        mode === 'force-fail' &&
        key &&
        adminPassword &&
        key === adminPassword
    );
};

const USE_NEW_PIPELINE = true; // Built-in flag for future reads. Always writes formats safely.

async function insertJobRun(supabase, job, runId, startedAt) {
    try {
        await supabase.from('job_runs').insert({
            id: runId,
            job_id: job.id,                // NEW
            status: 'processing',
            started_at: startedAt,

            // BACKWARD COMPATIBILITY
            job_class: job.job_type,
            payload: job.payload || {}
        });
    } catch (err) {
        console.warn('[Safe DB Write Failed] insertJobRun:', err.message);
    }
    return { id: runId, schema: 'unified' };
}

async function finalizeJobRunSuccess(supabase, runRecord, completedAt) {
    if (!runRecord) return;
    try {
        await supabase.from('job_runs').update({
            status: 'done',
            
            // NEW
            completed_at: completedAt,
            
            // OLD
            finished_at: completedAt
        }).eq('id', runRecord.id);
    } catch (err) {
        console.warn('[Safe DB Write Failed] finalizeJobRunSuccess:', err.message);
    }
}

async function finalizeJobRunFailure(supabase, runRecord, completedAt, errorMessage) {
    if (!runRecord) return;
    try {
        await supabase.from('job_runs').update({
            status: 'failed',
            
            // NEW
            error: errorMessage,
            
            // OLD
            failure_reason: errorMessage,
            completed_at: completedAt,
            finished_at: completedAt
        }).eq('id', runRecord.id);
    } catch (err) {
        console.warn('[Safe DB Write Failed] finalizeJobRunFailure:', err.message);
    }
}

async function insertDeadLetter(supabase, runRecord, job, errorMessage, failedAt) {
    try {
        await supabase.from('job_dead_letters').insert({
            job_id: job.id,                // NEW
            error: errorMessage,
            failed_at: failedAt,

            // OLD
            job_run_id: runRecord?.id,
            job_class: job.job_type,
            payload: job.payload || {},
            failure_reason: errorMessage,
            created_at: failedAt
        });
    } catch (err) {
        console.warn('[Safe DB Write Failed] insertDeadLetter:', err.message);
    }
}

export async function GET(request) {
    // Basic auth check for cron jobs if needed. Right now, running in safe mode.
    // Real implementation should secure this route.
    
    const supabase = getServiceSupabase();

    try {
        // 1. Fetch pending job
        // Order by created_at and pick the oldest pending job
        const { data: job, error: fetchErr } = await supabase
            .from('job_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!job) {
            return NextResponse.json({ message: "No pending jobs.", executed: false });
        }

        // 2. Mark processing inline to avoid race conditions
        const { data: updateData, error: updateErr } = await supabase
            .from('job_queue')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', job.id)
            .eq('status', 'pending')
            .select();

        if (updateErr || !updateData || updateData.length === 0) {
            return NextResponse.json({ message: "Job picked by another worker.", executed: false });
        }

        const processingJob = updateData[0];
        if (processingJob.status !== 'processing') {
            return NextResponse.json({ message: "Lock failed.", executed: false });
        }

        // Insert job_runs (processing)
        const runId = crypto.randomUUID();
        let runRecord = null;
        try {
            runRecord = await insertJobRun(supabase, job, runId, new Date().toISOString());
        } catch (runInsertErr) {
            console.warn(`[Worker Runner] job_runs insert failed [job_id: ${job.id}, job_type: ${job.job_type}, retry_count: ${job.retries}]: ${runInsertErr.message}`);
        }

        // 3. Call worker
        const forceFailure = isAuthorizedFailureTest(request);
        let workerErr = null;
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Job execution timed out after 10 seconds')), 10000)
            );
            await Promise.race([
                processJob(job, { forceFailure }),
                timeoutPromise
            ]);
        } catch (err) {
            workerErr = err;
            console.error(`[Worker Runner] Job Failed [job_id: ${job.id}, job_type: ${job.job_type}, retry_count: ${job.retries}]: ${err.message}`);
        }

        // 4. Update status based on result
        if (!workerErr) {
            // SUCCESS
            const now = new Date().toISOString();
            await finalizeJobRunSuccess(supabase, runRecord, now);

            await supabase.from('job_queue').update({
                status: 'done',
                updated_at: now
            }).eq('id', job.id);

            return NextResponse.json({ success: true, job_id: job.id, result: 'done' });
        } else {
            // FAILURE
            const newRetries = job.retries + 1;
            const now = new Date().toISOString();

            await finalizeJobRunFailure(supabase, runRecord, now, workerErr.message);

            if (newRetries >= 3) {
                // MOVE TO DEAD LETTER
                try {
                    await insertDeadLetter(supabase, runRecord, job, workerErr.message, now);
                } catch (deadLetterErr) {
                    console.warn(`[Worker Runner] dead letter insert failed [job_id: ${job.id}]: ${deadLetterErr.message}`);
                }
                
                await supabase.from('job_queue').update({
                    status: 'failed',
                    retries: newRetries,
                    updated_at: now
                }).eq('id', job.id);

                return NextResponse.json({ success: false, job_id: job.id, result: 'dead_letter', error: workerErr.message });
            } else {
                // RETRY (Pending)
                await supabase.from('job_queue').update({
                    status: 'pending',
                    retries: newRetries,
                    updated_at: now
                }).eq('id', job.id);

                return NextResponse.json({ success: false, job_id: job.id, result: 'retry', retries: newRetries, error: workerErr.message });
            }
        }
    } catch (e) {
        console.error(`[Worker Runner] Critical Failure [job_id: unknown, type: system, retry_count: N/A]: ${e.message}`);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
