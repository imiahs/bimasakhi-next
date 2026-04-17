import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const supabase = getServiceSupabase();

        // QStash-native log aggregation — no BullMQ/worker_health
        const [observabilityRes, runtimeRes, deadLettersRes, jobRunsRes] = await Promise.all([
            supabase
                .from('observability_logs')
                .select('id, level, message, metadata, source, created_at')
                .order('created_at', { ascending: false })
                .limit(100),
            supabase
                .from('system_runtime_errors')
                .select('id, component, error_message, metadata, created_at')
                .order('created_at', { ascending: false })
                .limit(100),
            supabase
                .from('job_dead_letters')
                .select('id, job_class, error, failure_reason, failed_at, created_at')
                .order('failed_at', { ascending: false })
                .limit(25),
            supabase
                .from('job_runs')
                .select('id, worker_id, status, started_at, finished_at, error, failure_reason')
                .order('started_at', { ascending: false })
                .limit(25)
        ]);

        if (observabilityRes.error || runtimeRes.error || deadLettersRes.error || jobRunsRes.error) {
            throw observabilityRes.error || runtimeRes.error || deadLettersRes.error || jobRunsRes.error;
        }

        const logs = [
            ...((observabilityRes.data || []).map((log) => ({
                id: `obs_${log.id}`,
                type: log.level || 'INFO',
                message: log.message,
                metadata: {
                    ...(log.metadata || {}),
                    source: log.source
                },
                created_at: log.created_at
            }))),
            ...((runtimeRes.data || []).map((log) => ({
                id: `runtime_${log.id}`,
                type: 'ERROR',
                message: `${log.component}: ${log.error_message}`,
                metadata: log.metadata || {},
                created_at: log.created_at
            }))),
            ...((deadLettersRes.data || []).map((log) => ({
                id: `dead_${log.id}`,
                type: 'DEAD_LETTER',
                message: `${log.job_class || 'unknown-job'}: ${log.error || log.failure_reason || 'No failure reason recorded'}`,
                metadata: {},
                created_at: log.failed_at || log.created_at
            }))),
            ...((jobRunsRes.data || []).map((run) => ({
                id: `run_${run.id}`,
                type: run.status === 'failed' ? 'ERROR' : 'INFO',
                message: `job_run [${run.worker_id || 'worker'}]: ${run.status}${run.error || run.failure_reason ? ' — ' + (run.error || run.failure_reason) : ''}`,
                metadata: { worker_id: run.worker_id, status: run.status, finished_at: run.finished_at },
                created_at: run.started_at
            })))
        ]
            .filter((log) => {
                if (!type) return true;
                return log.type === type || log.message.includes(type);
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 100);

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error('Logs API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
    }
});
