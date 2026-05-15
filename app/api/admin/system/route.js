import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getShosSnapshot } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const snapshot = await getShosSnapshot({ dlqLimit: 5, queueLimit: 5, deliveryLimit: 5, alertLimit: 5, errorLimit: 5 });
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

        const crmEnabled = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'crm_auto_routing')?.value);
        const hasQueuePressure = (snapshot.metrics?.queue_failed || 0) > 0 || (snapshot.metrics?.dlq_pending || 0) > 0;
        const hasDeliveryPressure = (snapshot.metrics?.delivery_failed || 0) > 0 || (snapshot.health?.failures?.delivery_stuck_count || 0) > 0;

        statuses.qstash = hasDeliveryPressure ? 'red' : 'green';
        statuses.zoho_api = crmEnabled ? 'green' : 'yellow';
        statuses.background_workers = hasQueuePressure ? 'red' : 'green';
        statuses.media_pipeline = snapshot.metrics?.overall_health === 'DEGRADED' ? 'yellow' : 'green';

        const overall = snapshot.metrics?.overall_health === 'DEGRADED'
            ? 'red'
            : snapshot.metrics?.overall_health === 'SAFE_MODE'
                ? 'yellow'
                : 'green';

        const metrics = {
            generation_backlog: snapshot.metrics?.queue_pending || 0,
            recent_job_failures: snapshot.metrics?.queue_failed || 0,
            dead_letters: snapshot.metrics?.dlq_pending || 0
        };

        return NextResponse.json({ success: true, statuses, overall, metrics, canonical_source: snapshot.source });
    } catch (error) {
        console.error('API /admin/system GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch system health' }, { status: 500 });
    }
});
