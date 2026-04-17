/**
 * EVENT STORE — Write-Ahead Log for business events.
 * 
 * RULE: Every event is written to DB BEFORE dispatch.
 * If dispatch fails, the event remains in DB for retry.
 * 
 * COMPLETION TRACKING:
 * - Workers MUST call markCompleted() or markFailed() after execution
 * - No silent completion allowed
 * - Stuck events (dispatched but no ACK) are auto-detected
 * 
 * Priority levels:
 *   CRITICAL — leads, contacts (MUST never fail)
 *   NORMAL   — pagegen, AI, analytics (can tolerate delay)
 */
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

// Data priority classification (Rule 6)
const CRITICAL_EVENTS = new Set([
    'lead_created',
    'contact_created',
    'lead_hot',
    'agent_applied',
    'payment_received',
]);

// Stuck threshold: events dispatched but not completed after this many minutes
const STUCK_THRESHOLD_MINUTES = 15;

export function getEventPriority(eventName) {
    return CRITICAL_EVENTS.has(eventName) ? 'critical' : 'normal';
}

/**
 * Write event to durable store BEFORE any dispatch attempt.
 * Returns the stored event record with its ID.
 */
export async function writeEvent(eventName, payload, source, executionContext = null) {
    const supabase = getServiceSupabase();
    const priority = getEventPriority(eventName);

    const { data, error } = await supabase
        .from('event_store')
        .insert({
            event_name: eventName,
            payload,
            source,
            status: 'pending',
            priority,
            retry_count: 0,
            max_retries: priority === 'critical' ? 10 : 5,
            execution_context: executionContext,
            correlation_id: executionContext?.correlation_id || null,
        })
        .select('id, event_name, status, priority')
        .single();

    if (error) {
        // If event_store table doesn't exist, graceful degradation
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('[EventStore] Table missing — operating without write-ahead log');
            return { id: null, event_name: eventName, status: 'no_wal', priority };
        }
        throw new Error(`[EventStore] Write failed: ${error.message}`);
    }

    return data;
}

/**
 * Mark event as dispatched after successful QStash publish.
 */
export async function markDispatched(eventStoreId, messageId) {
    if (!eventStoreId) return;
    const supabase = getServiceSupabase();

    try {
        await supabase.from('event_store').update({
            status: 'dispatched',
            dispatch_message_id: messageId,
            dispatched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', eventStoreId);
    } catch (e) {
        console.error('[EventStore] markDispatched failed:', e.message);
    }
}

/**
 * Mark event as COMPLETED — Worker ACK (Rule 2).
 * Workers MUST call this after successful execution. No silent completion.
 * 
 * @param {string} eventStoreId - The event_store row ID
 * @param {object} workerResult - Execution details for traceability
 */
export async function markCompleted(eventStoreId, workerResult = {}) {
    if (!eventStoreId) return;
    const supabase = getServiceSupabase();

    const { error } = await supabase.from('event_store').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        worker_result: workerResult,
    }).eq('id', eventStoreId);

    if (error) {
        console.error('[EventStore] markCompleted failed:', error.message);
        // Fallback: try without worker_result column (may not exist yet)
        if (error.message?.includes('worker_result') || error.code === '42703') {
            try { await supabase.from('event_store').update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }).eq('id', eventStoreId); } catch (_) {}
        }
    }
}

/**
 * Mark event as FAILED — Worker failure ACK (Rule 2).
 * Workers MUST call this on failure. No silent failures.
 * 
 * @param {string} eventStoreId - The event_store row ID
 * @param {string|Error} error - The error that caused failure
 * @param {object} partialResult - Any partial results (Rule 6: partial failure visibility)
 */
export async function markFailed(eventStoreId, error, partialResult = null) {
    if (!eventStoreId) return;
    const supabase = getServiceSupabase();

    const updatePayload = {
        status: 'failed',
        last_error: typeof error === 'string' ? error : error?.message || 'unknown',
        updated_at: new Date().toISOString(),
    };

    // Include partial result for visibility (Rule 6)
    if (partialResult) {
        updatePayload.worker_result = partialResult;
    }

    const { error: updateErr } = await supabase.from('event_store')
        .update(updatePayload)
        .eq('id', eventStoreId);

    if (updateErr) {
        // Fallback without worker_result
        if (updateErr.message?.includes('worker_result') || updateErr.code === '42703') {
            delete updatePayload.worker_result;
            try { await supabase.from('event_store').update(updatePayload).eq('id', eventStoreId); } catch (_) {}
        } else {
            console.error('[EventStore] markFailed failed:', updateErr.message);
        }
    }
}

/**
 * Mark event as skipped (policy blocked, duplicate, etc).
 */
export async function markSkipped(eventStoreId, reason) {
    if (!eventStoreId) return;
    const supabase = getServiceSupabase();

    try {
        await supabase.from('event_store').update({
            status: 'skipped',
            last_error: reason,
            updated_at: new Date().toISOString(),
        }).eq('id', eventStoreId);
    } catch (e) {
        console.error('[EventStore] markSkipped failed:', e.message);
    }
}

/**
 * Get pending/failed events for retry daemon.
 * Prioritizes CRITICAL events first.
 */
export async function getRetryableEvents(limit = 20) {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_store')
        .select('*')
        .in('status', ['pending', 'failed'])
        .order('priority', { ascending: true })  // critical first
        .order('created_at', { ascending: true }) // oldest first
        .limit(limit);

    if (error) {
        console.error('[EventStore] getRetryableEvents failed:', error.message);
        return [];
    }

    // Filter out events that exceeded max_retries
    return (data || []).filter(e => e.retry_count < e.max_retries);
}

/**
 * STUCK EVENT DETECTION (Rule 3)
 * Find events that were dispatched but never completed.
 * These events are "stuck" — the worker never sent an ACK.
 */
export async function getStuckEvents(thresholdMinutes = STUCK_THRESHOLD_MINUTES, limit = 50) {
    const supabase = getServiceSupabase();
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('event_store')
        .select('*')
        .eq('status', 'dispatched')
        .lt('dispatched_at', cutoff)
        .order('priority', { ascending: true })
        .order('dispatched_at', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('[EventStore] getStuckEvents failed:', error.message);
        return [];
    }

    return data || [];
}

/**
 * Mark stuck events as failed so the retry daemon picks them up.
 * Returns count of events marked.
 */
export async function markStuckAsFailed(thresholdMinutes = STUCK_THRESHOLD_MINUTES) {
    const stuck = await getStuckEvents(thresholdMinutes);
    if (!stuck.length) return { marked: 0 };

    const supabase = getServiceSupabase();
    let marked = 0;

    for (const event of stuck) {
        await supabase.from('event_store').update({
            status: 'failed',
            last_error: `stuck: no completion ACK after ${thresholdMinutes} minutes`,
            updated_at: new Date().toISOString(),
        }).eq('id', event.id);

        try { await supabase.from('observability_logs').insert({
            level: event.priority === 'critical' ? 'CRITICAL_STUCK_EVENT' : 'STUCK_EVENT',
            message: `Stuck event detected: ${event.event_name} (dispatched ${event.dispatched_at}, no ACK)`,
            source: 'stuck_detector',
            metadata: {
                event_store_id: event.id,
                event_name: event.event_name,
                priority: event.priority,
                dispatched_at: event.dispatched_at,
                correlation_id: event.correlation_id,
            },
        }); } catch (_) {}

        marked++;
    }

    return { marked, events: stuck.map(e => ({ id: e.id, event_name: e.event_name, priority: e.priority })) };
}

/**
 * Increment retry count for an event.
 */
export async function incrementRetry(eventStoreId) {
    if (!eventStoreId) return;
    const supabase = getServiceSupabase();

    // Use raw SQL to atomically increment
    const { error } = await supabase.rpc('increment_event_retry', { event_id: eventStoreId });

    if (error) {
        // Fallback: read-then-write (non-atomic but functional)
        const { data } = await supabase
            .from('event_store')
            .select('retry_count')
            .eq('id', eventStoreId)
            .single();

        if (data) {
            await supabase.from('event_store').update({
                retry_count: (data.retry_count || 0) + 1,
                updated_at: new Date().toISOString(),
            }).eq('id', eventStoreId);
        }
    }
}

/**
 * Get event store stats for admin dashboard (Rule 7: Metrics).
 */
export async function getEventStoreStats() {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from('event_store')
        .select('status, priority, created_at, dispatched_at, completed_at');

    if (error) return { error: error.message };

    const stats = {
        total: 0,
        by_status: { pending: 0, dispatched: 0, failed: 0, completed: 0, skipped: 0 },
        by_priority: { critical: 0, normal: 0 },
        critical_failed: 0,
        stuck_count: 0,
        completion_rate: 0,
        avg_execution_time_ms: 0,
    };

    let totalExecutionTime = 0;
    let completedWithTime = 0;
    const stuckCutoff = Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000;

    (data || []).forEach(row => {
        stats.total++;
        if (stats.by_status[row.status] !== undefined) stats.by_status[row.status]++;
        if (stats.by_priority[row.priority] !== undefined) stats.by_priority[row.priority]++;
        if (row.priority === 'critical' && row.status === 'failed') stats.critical_failed++;

        // Stuck detection
        if (row.status === 'dispatched' && row.dispatched_at && new Date(row.dispatched_at).getTime() < stuckCutoff) {
            stats.stuck_count++;
        }

        // Execution time calculation
        if (row.status === 'completed' && row.dispatched_at && row.completed_at) {
            const execTime = new Date(row.completed_at).getTime() - new Date(row.dispatched_at).getTime();
            if (execTime > 0 && execTime < 600000) { // sanity: < 10 min
                totalExecutionTime += execTime;
                completedWithTime++;
            }
        }
    });

    // Completion rate: completed / (completed + failed)
    const terminal = stats.by_status.completed + stats.by_status.failed;
    stats.completion_rate = terminal > 0 ? Math.round((stats.by_status.completed / terminal) * 10000) / 100 : 0;

    // Average execution time
    stats.avg_execution_time_ms = completedWithTime > 0 ? Math.round(totalExecutionTime / completedWithTime) : 0;

    return stats;
}

/**
 * Get timeline for a specific lead — all events with this leadId across event_store + observability_logs.
 * (Rule 5: Admin timeline view)
 */
export async function getEventTimeline(leadId, correlationId = null) {
    const supabase = getServiceSupabase();
    const timeline = [];

    // 1. Event store entries for this lead
    const eventStoreQuery = supabase
        .from('event_store')
        .select('*')
        .order('created_at', { ascending: true });

    // Search by correlation_id if provided, otherwise search payload for leadId
    if (correlationId) {
        eventStoreQuery.eq('correlation_id', correlationId);
    }

    const { data: events } = await eventStoreQuery.limit(50);
    const relevantEvents = (events || []).filter(e => {
        if (correlationId && e.correlation_id === correlationId) return true;
        const p = e.payload;
        return p?.leadId === leadId || p?.contactId === leadId;
    });

    for (const evt of relevantEvents) {
        timeline.push({
            timestamp: evt.created_at,
            phase: 'event_store',
            action: `${evt.event_name} → ${evt.status}`,
            status: evt.status,
            details: {
                event_store_id: evt.id,
                priority: evt.priority,
                retry_count: evt.retry_count,
                dispatch_message_id: evt.dispatch_message_id,
                last_error: evt.last_error,
                worker_result: evt.worker_result,
                dispatched_at: evt.dispatched_at,
                completed_at: evt.completed_at,
            },
        });
    }

    // 2. Observability logs with this lead's correlation_id or lead_id
    const logQuery = supabase
        .from('observability_logs')
        .select('level, message, source, metadata, created_at')
        .order('created_at', { ascending: true })
        .limit(100);

    const { data: logs } = await logQuery;
    const relevantLogs = (logs || []).filter(log => {
        const m = log.metadata;
        if (!m) return false;
        if (m.lead_id === leadId || m.leadId === leadId) return true;
        if (correlationId && m.correlation_id === correlationId) return true;
        if (m.event_id && relevantEvents.some(e => e.execution_context?.event_id === m.event_id)) return true;
        return false;
    });

    for (const log of relevantLogs) {
        let phase = 'system';
        if (log.source === 'event_bus') phase = 'event_bus';
        else if (log.source?.startsWith('executive_')) phase = 'executive';
        else if (log.source === 'tool_registry') phase = 'tool';
        else if (log.source === 'lead_state_machine') phase = 'state_machine';
        else if (log.source?.includes('worker') || log.source?.includes('scorer') || log.source?.includes('followup')) phase = 'worker';

        timeline.push({
            timestamp: log.created_at,
            phase,
            action: log.message,
            status: log.level,
            details: {
                source: log.source,
                ...log.metadata,
            },
        });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return timeline;
}
