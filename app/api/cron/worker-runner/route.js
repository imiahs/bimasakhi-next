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

async function insertJobRun(supabase, job, runId, startedAt) {
    const nextPayload = {
        id: runId,
        job_id: job.id,
        status: 'processing',
        started_at: startedAt
    };

    const { error: nextErr } = await supabase.from('job_runs').insert(nextPayload);
    if (!nextErr) {
        return { id: runId, schema: 'next' };
    }

    const legacyPayload = {
        id: runId,
        job_class: job.job_type,
        payload: job.payload || {},
        status: 'processing',
        started_at: startedAt,
        created_at: startedAt
    };

    const { error: legacyErr } = await supabase.from('job_runs').insert(legacyPayload);
    if (!legacyErr) {
        return { id: runId, schema: 'legacy' };
    }

    throw new Error(`next=${nextErr.message}; legacy=${legacyErr.message}`);
}

async function finalizeJobRunSuccess(supabase, runRecord, completedAt) {
    if (!runRecord) return;

    const updates = runRecord.schema === 'legacy'
        ? { status: 'done', finished_at: completedAt }
        : { status: 'done', completed_at: completedAt };

    const { error } = await supabase.from('job_runs').update(updates).eq('id', runRecord.id);
    if (error) {
        console.warn(`[Worker Runner] job_runs success finalize failed [run_id: ${runRecord.id}]: ${error.message}`);
    }
}

async function finalizeJobRunFailure(supabase, runRecord, completedAt, errorMessage) {
    if (!runRecord) return;

    const updates = runRecord.schema === 'legacy'
        ? { status: 'failed', finished_at: completedAt, failure_reason: errorMessage }
        : { status: 'failed', completed_at: completedAt, error: errorMessage };

    const { error } = await supabase.from('job_runs').update(updates).eq('id', runRecord.id);
    if (error) {
        console.warn(`[Worker Runner] job_runs failure finalize failed [run_id: ${runRecord.id}]: ${error.message}`);
    }
}

async function insertDeadLetter(supabase, runRecord, job, errorMessage, failedAt) {
    const nextPayload = {
        job_id: job.id,
        payload: job.payload,
        error: errorMessage,
        failed_at: failedAt
    };

    const { error: nextErr } = await supabase.from('job_dead_letters').insert(nextPayload);
    if (!nextErr) return;

    if (!runRecord) {
        throw new Error(`next=${nextErr.message}; legacy=missing job_run_id`);
    }

    const legacyPayload = {
        job_run_id: runRecord.id,
        job_class: job.job_type,
        payload: job.payload,
        failure_reason: errorMessage,
        created_at: failedAt
    };

    const { error: legacyErr } = await supabase.from('job_dead_letters').insert(legacyPayload);
    if (!legacyErr) return;

    throw new Error(`next=${nextErr.message}; legacy=${legacyErr.message}`);
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
