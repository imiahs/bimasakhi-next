import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getEventStoreStats, getStuckEvents } from '@/lib/events/eventStore';
import { getSystemMode, getModeDescription } from '@/lib/system/systemModes';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const supabase = getServiceSupabase();

        // QStash-native observability — no BullMQ/worker_health
        const [queueRes, deadLettersRes, runsRes, eventBusRes, executiveRes] = await Promise.all([
            supabase.from('generation_queue').select('status'),
            supabase.from('job_dead_letters').select('id', { count: 'exact', head: true }),
            supabase.from('job_runs').select('status'),
            supabase.from('observability_logs').select('level, message, metadata, created_at')
                .in('level', ['EVENT_DISPATCHED', 'EVENT_DISPATCH_FAILED', 'EVENT_POLICY_BLOCKED'])
                .order('created_at', { ascending: false }).limit(20),
            supabase.from('observability_logs').select('level, message, metadata, created_at')
                .in('level', ['EXECUTIVE_COMPLETE', 'EXECUTIVE_FAILED', 'TOOL_SUCCESS', 'TOOL_FAILURE'])
                .order('created_at', { ascending: false }).limit(20),
        ]);

        // Event store stats (graceful — may not exist yet)
        let eventStoreStats = null;
        let stuckEvents = [];
        try {
            eventStoreStats = await getEventStoreStats();
            stuckEvents = await getStuckEvents(15, 10);
        } catch { /* table may not exist */ }

        // System mode
        const systemMode = await getSystemMode();

        return NextResponse.json({
            success: true,
            system_mode: systemMode,
            system_mode_description: getModeDescription(systemMode),
            snapshot: {
                jobs_processed: (runsRes.data || []).filter((row) => ['done', 'completed'].includes(row.status)).length,
                jobs_failed: (runsRes.data || []).filter((row) => row.status === 'failed').length,
                queue_depth: (queueRes.data || []).filter((row) => ['pending', 'processing'].includes(row.status)).length,
                dead_letters: deadLettersRes.count || 0
            },
            event_store: eventStoreStats,
            stuck_events: stuckEvents.map(e => ({
                id: e.id,
                event_name: e.event_name,
                priority: e.priority,
                dispatched_at: e.dispatched_at,
                minutes_stuck: Math.round((Date.now() - new Date(e.dispatched_at).getTime()) / 60000),
            })),
            event_bus: (eventBusRes.data || []).map(log => ({
                level: log.level,
                message: log.message,
                event: log.metadata?.event,
                executive: log.metadata?.executive,
                created_at: log.created_at,
            })),
            executives: (executiveRes.data || []).map(log => ({
                level: log.level,
                message: log.message,
                tool: log.metadata?.tool,
                executive: log.metadata?.executive,
                event_id: log.metadata?.event_id,
                duration_ms: log.metadata?.duration_ms,
                created_at: log.created_at,
            })),
        });
    } catch (error) {
        console.error('Failed to fetch observability snapshot:', error);
        return NextResponse.json({ success: false, error: 'Database timeout' }, { status: 500 });
    }
});
