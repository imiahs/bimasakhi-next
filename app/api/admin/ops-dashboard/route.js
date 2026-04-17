import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getEventStoreStats, getStuckEvents } from '@/lib/events/eventStore';
import { getSystemMode } from '@/lib/system/systemModes';
import { THRESHOLDS } from '@/lib/monitoring/alertSystem';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ops-dashboard
 * 
 * Real-time operational dashboard. Single endpoint returning all metrics
 * needed for a production ops view.
 * 
 * Returns:
 *   - system_mode: current mode (normal/degraded/emergency)
 *   - events_per_minute: recent event throughput
 *   - success_vs_failure: counts + rates
 *   - queue_backlog: pending/dispatched events
 *   - active_errors: recent error-level logs
 *   - active_alerts: unresolved alerts
 *   - stuck_events: events stuck in dispatched
 *   - health: overall health verdict
 */
export const GET = withAdminAuth(async (request) => {
    try {
        const supabase = getServiceSupabase();

        // Run all queries in parallel for speed
        const [
            systemMode,
            eventStoreStats,
            stuckEvents,
            eventsPerMinData,
            activeErrors,
            activeAlerts,
            queueDepth,
            recentDeadLetters,
        ] = await Promise.all([
            // 1. System mode
            getSystemMode(),

            // 2. Event store stats
            getEventStoreStats(),

            // 3. Stuck events
            getStuckEvents(15, 20),

            // 4. Events per minute (last 10 min window)
            (async () => {
                const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                const { count } = await supabase
                    .from('event_store')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', tenMinsAgo);
                return { count: count || 0, per_minute: Math.round((count || 0) / 10 * 10) / 10 };
            })(),

            // 5. Active errors (last 30 min)
            (async () => {
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                const { data } = await supabase
                    .from('observability_logs')
                    .select('id, level, message, source, created_at')
                    .in('level', ['ERROR', 'CRITICAL', 'CONSISTENCY_VIOLATION', 'DB_CONTRACT_VIOLATION', 'SAGA_COMPENSATED', 'CRITICAL_STUCK_EVENT'])
                    .gte('created_at', thirtyMinsAgo)
                    .order('created_at', { ascending: false })
                    .limit(20);
                return data || [];
            })(),

            // 6. Active (unresolved) alerts
            (async () => {
                const { data } = await supabase
                    .from('system_alerts')
                    .select('id, alert_type, severity, message, created_at')
                    .eq('resolved', false)
                    .order('created_at', { ascending: false })
                    .limit(20);
                return data || [];
            })(),

            // 7. Queue backlog (pending + dispatched in event_store)
            (async () => {
                const { count: pending } = await supabase
                    .from('event_store')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');
                const { count: dispatched } = await supabase
                    .from('event_store')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'dispatched');
                return { pending: pending || 0, dispatched: dispatched || 0, total: (pending || 0) + (dispatched || 0) };
            })(),

            // 8. Recent dead letters (last 24h)
            (async () => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { count } = await supabase
                    .from('job_dead_letters')
                    .select('*', { count: 'exact', head: true })
                    .gte('failed_at', dayAgo);
                return count || 0;
            })(),
        ]);

        // Derive health verdict
        const healthIssues = [];
        if (systemMode !== 'normal') healthIssues.push(`system_mode=${systemMode}`);
        if (stuckEvents.length > 0) healthIssues.push(`${stuckEvents.length} stuck events`);
        if (eventStoreStats.completion_rate < THRESHOLDS.completion_rate_min) healthIssues.push(`completion_rate=${eventStoreStats.completion_rate}%`);
        if (activeAlerts.length > 0) healthIssues.push(`${activeAlerts.length} active alerts`);
        if (activeErrors.length > 10) healthIssues.push(`${activeErrors.length} errors in 30 min`);

        const health = healthIssues.length === 0 ? 'HEALTHY' :
            healthIssues.some(i => i.includes('stuck') || i.includes('emergency')) ? 'CRITICAL' : 'DEGRADED';

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            health: {
                status: health,
                issues: healthIssues,
            },
            system_mode: systemMode,
            events_per_minute: eventsPerMinData.per_minute,
            success_vs_failure: {
                total: eventStoreStats.total || 0,
                completed: eventStoreStats.by_status?.completed || 0,
                failed: eventStoreStats.by_status?.failed || 0,
                pending: eventStoreStats.by_status?.pending || 0,
                dispatched: eventStoreStats.by_status?.dispatched || 0,
                completion_rate: eventStoreStats.completion_rate || 0,
            },
            queue_backlog: queueDepth,
            stuck_events: {
                count: stuckEvents.length,
                events: stuckEvents.map(e => ({
                    id: e.id,
                    event_name: e.event_name,
                    dispatched_at: e.dispatched_at,
                    minutes_stuck: Math.round((Date.now() - new Date(e.dispatched_at).getTime()) / 60000),
                })),
            },
            active_errors: {
                count: activeErrors.length,
                errors: activeErrors,
            },
            active_alerts: {
                count: activeAlerts.length,
                alerts: activeAlerts,
            },
            dead_letters_24h: recentDeadLetters,
        });
    } catch (err) {
        console.error('[OpsDashboard] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
});
