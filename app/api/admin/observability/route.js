import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        const [queueRes, workersRes, deadLettersRes, runsRes] = await Promise.all([
            supabase.from('generation_queue').select('status'),
            supabase.from('worker_health').select('status, last_run'),
            supabase.from('job_dead_letters').select('id', { count: 'exact', head: true }),
            supabase.from('job_runs').select('status')
        ]);

        return NextResponse.json({
            success: true,
            snapshot: {
                jobs_processed: (runsRes.data || []).filter((row) => ['done', 'completed'].includes(row.status)).length,
                jobs_failed: (runsRes.data || []).filter((row) => row.status === 'failed').length,
                queue_depth: (queueRes.data || []).filter((row) => ['pending', 'processing'].includes(row.status)).length,
                dead_letters: deadLettersRes.count || 0,
                stale_workers: (workersRes.data || []).filter((row) => row.status === 'error').length
            }
        });
    } catch (error) {
        console.error('Failed to fetch observability snapshot:', error);
        return NextResponse.json({ success: false, error: 'Database timeout' }, { status: 500 });
    }
});
