import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import { getLocalDb } from '@/utils/localDb';
import { checkRedisStatus } from '@/lib/queue/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const ObjectStatuses = {
            supabase: 'red',
            sqlite: 'red',
            redis: 'red',
            zoho_api: 'yellow', // Simulated since we lack direct ping here
            background_workers: 'yellow',
            media_pipeline: 'green' // Native image components
        };

        // 1. Supabase Check
        try {
            const supabase = getServiceSupabase();
            const { error } = await supabase.from('seo_overrides').select('id').limit(1);
            if (!error) statuses.supabase = 'green';
        } catch { }

        // 2. SQLite Check
        try {
            const db = getLocalDb();
            const row = db.prepare('SELECT COUNT(*) as c FROM observability_logs').get();
            if (row) statuses.sqlite = 'green';
        } catch { }

        // 3. Workers Check (Check if recent backup exists as a proxy for workers)
        try {
            const fs = require('fs');
            const path = require('path');
            const backupsDir = path.join(process.cwd(), 'backups');
            if (fs.existsSync(backupsDir)) {
                statuses.background_workers = 'green';
            }
        } catch { }

        // 4. Redis Check
        try {
            const redisCheck = await checkRedisStatus();
            if (redisCheck.redis_status === 'online') {
                ObjectStatuses.redis = 'green';
            }
        } catch { }

        // Aggregate system health
        const allGreen = Object.values(ObjectStatuses).every(s => s === 'green');
        const anyRed = Object.values(ObjectStatuses).some(s => s === 'red');
        const overall = anyRed ? 'red' : (allGreen ? 'green' : 'yellow');

        // 5. Fetch telemetry snapshot for Performance Summary
        const supabaseService = getServiceSupabase();
        const { data: snapshot } = await supabaseService.from('system_metrics_snapshot').select('*').limit(1).single();

        return NextResponse.json({ success: true, statuses: ObjectStatuses, overall, metrics: snapshot });
    } catch (error) {
        console.error('API /admin/system GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system health' }, { status: 500 });
    }
}
