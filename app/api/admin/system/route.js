import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const statuses = {
            supabase: 'red',
            qstash: 'green',
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

        // 2. QStash is stateless — assumed green (Upstash managed)

        // Aggregate system health
        const allGreen = Object.values(statuses).every(s => s === 'green');
        const anyRed = Object.values(statuses).some(s => s === 'red');
        const overall = anyRed ? 'red' : (allGreen ? 'green' : 'yellow');

        // 3. Fetch telemetry snapshot (QStash-native — no BullMQ/worker_health)
        const supabaseService = getServiceSupabase();
        const [queueRes, deadLettersRes, recentRunsRes] = await Promise.all([
            supabaseService.from('generation_queue').select('status'),
            supabaseService.from('job_dead_letters').select('id', { count: 'exact', head: true }),
            supabaseService.from('job_runs').select('status').order('started_at', { ascending: false }).limit(50)
        ]);

        const deadLetters = deadLettersRes.count || 0;
        const generationBacklog = (queueRes.data || []).filter((row) => ['pending', 'processing'].includes(row.status)).length;
        const recentJobsFailed = (recentRunsRes.data || []).filter((row) => row.status === 'failed').length;

        if (deadLetters === 0 && recentJobsFailed === 0) {
            statuses.background_workers = 'green';
        } else if (deadLetters > 0 || recentJobsFailed > 0) {
            statuses.background_workers = 'red';
        }

        const metrics = {
            generation_backlog: generationBacklog,
            recent_job_failures: recentJobsFailed,
            dead_letters: deadLetters
        };

        return NextResponse.json({ success: true, statuses, overall, metrics });
    } catch (error) {
        console.error('API /admin/system GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system health' }, { status: 500 });
    }
});
