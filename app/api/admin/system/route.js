import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const statuses = {
            supabase: 'red',
            redis: 'red',
            zoho_api: 'yellow',
            background_workers: 'yellow',
            media_pipeline: 'green'
        };

        // 1. Supabase Check
        try {
            const supabase = getServiceSupabase();
            const { error } = await supabase.from('seo_overrides').select('id').limit(1);
            if (!error) statuses.supabase = 'green';
        } catch { }

        // 2. Redis Check Removed (BullMQ deprecated)
        statuses.redis = 'green';

        // Aggregate system health
        const allGreen = Object.values(statuses).every(s => s === 'green');
        const anyRed = Object.values(statuses).some(s => s === 'red');
        const overall = anyRed ? 'red' : (allGreen ? 'green' : 'yellow');

        // 3. Fetch telemetry snapshot
        const supabaseService = getServiceSupabase();
        const [queueRes, workersRes, deadLettersRes] = await Promise.all([
            supabaseService.from('generation_queue').select('status'),
            supabaseService.from('worker_health').select('status, last_heartbeat').limit(20),
            supabaseService.from('job_dead_letters').select('id', { count: 'exact', head: true })
        ]);

        const workerErrors = (workersRes.data || []).filter((row) => row.status === 'error').length;
        const deadLetters = deadLettersRes.count || 0;
        const generationBacklog = (queueRes.data || []).filter((row) => ['pending', 'processing'].includes(row.status)).length;

        if (workerErrors === 0 && deadLetters === 0) {
            statuses.background_workers = 'green';
        } else if (workerErrors > 0 || deadLetters > 0) {
            statuses.background_workers = 'red';
        }

        const metrics = {
            generation_backlog: generationBacklog,
            worker_errors: workerErrors,
            dead_letters: deadLetters
        };

        return NextResponse.json({ success: true, statuses, overall, metrics });
    } catch (error) {
        console.error('API /admin/system GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system health' }, { status: 500 });
    }
});
