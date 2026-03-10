import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { checkRedisStatus } from '@/lib/queue/redis';
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

        // 2. Redis Check
        try {
            const redisCheck = await checkRedisStatus();
            if (redisCheck.redis_status === 'online') {
                statuses.redis = 'green';
            }
        } catch { }

        // Aggregate system health
        const allGreen = Object.values(statuses).every(s => s === 'green');
        const anyRed = Object.values(statuses).some(s => s === 'red');
        const overall = anyRed ? 'red' : (allGreen ? 'green' : 'yellow');

        // 3. Fetch telemetry snapshot
        const supabaseService = getServiceSupabase();
        const { data: snapshot } = await supabaseService.from('system_metrics_snapshot').select('*').limit(1).single();

        return NextResponse.json({ success: true, statuses, overall, metrics: snapshot });
    } catch (error) {
        console.error('API /admin/system GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system health' }, { status: 500 });
    }
});
