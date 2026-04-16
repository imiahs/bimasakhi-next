import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { getSystemConfig } from '@/lib/systemConfig';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();
        const config = await getSystemConfig();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            todayRes,
            failedRes,
            retryPendingRes,
            queueRes,
            errorsRes,
            deadLettersRes,
            leadSyncLagRes,
            contactErrorsRes
        ] = await Promise.all([
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', today.toISOString()),
            supabase
                .from('failed_leads')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('failed_leads')
                .select('id', { count: 'exact', head: true })
                .lt('retry_count', 3),
            supabase
                .from('generation_queue')
                .select('status'),
            supabase
                .from('system_runtime_errors')
                .select('component, error_message, created_at, resolved')
                .order('created_at', { ascending: false })
                .limit(10),
            supabase
                .from('job_dead_letters')
                .select('id', { count: 'exact', head: true }),
            supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('sync_status', 'pending'),
            supabase
                .from('observability_logs')
                .select('id, message, created_at, source')
                .in('source', ['api_contact_sync', 'worker_contact_sync'])
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        const firstError =
            todayRes.error ||
            failedRes.error ||
            retryPendingRes.error ||
            queueRes.error ||
            errorsRes.error ||
            deadLettersRes.error ||
            leadSyncLagRes.error ||
            contactErrorsRes.error;

        if (firstError) {
            throw firstError;
        }

        const queueRows = queueRes.data || [];
        const failedQueueJobs = queueRows.filter((job) => job.status === 'failed').length;
        const failedLeadsCount = failedRes.count || 0;

        const crmStatus = !config.crm_auto_routing
            ? 'Paused'
            : failedLeadsCount > 0 ? 'Degraded' : 'Operational';

        const aiStatus = !config.ai_enabled
            ? 'Paused'
            : config.queue_paused ? 'Paused'
            : failedQueueJobs > 0 ? 'Degraded' : 'Operational';

        return NextResponse.json({
            success: true,
            data: {
                crm_status: crmStatus,
                ai_status: aiStatus,
                queue_paused: config.queue_paused,
                total_leads_today: todayRes.count || 0,
                failed_leads_count: failedLeadsCount,
                retry_pending: retryPendingRes.count || 0,
                generation_backlog: queueRows.filter((job) => ['pending', 'processing'].includes(job.status)).length,
                dead_letters: deadLettersRes.count || 0,
                lead_sync_lag: leadSyncLagRes.count || 0,
                recent_contact_failures: contactErrorsRes.data || [],
                last_10_errors: (errorsRes.data || []).map((row) => ({
                    component: row.component,
                    message: row.error_message,
                    created_at: row.created_at,
                    resolved: row.resolved
                }))
            }
        });
    } catch (error) {
        console.error('System health API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch system health'
        }, { status: 500 });
    }
});
